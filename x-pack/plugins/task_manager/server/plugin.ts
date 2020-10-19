/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { PluginInitializerContext, Plugin, CoreSetup, Logger, CoreStart } from 'src/core/server';
import { combineLatest, Subject } from 'rxjs';
import { first, map } from 'rxjs/operators';
import { TaskDefinition } from './task';
import { TaskPollingLifecycle } from './polling_lifecycle';
import { TaskManagerConfig } from './config';
import { createInitialMiddleware, addMiddlewareToChain, Middleware } from './lib/middleware';
import { setupSavedObjects } from './saved_objects';
import { TaskTypeDictionary } from './task_type_dictionary';
import { FetchResult, SearchOpts, TaskStore } from './task_store';
import { createManagedConfiguration } from './lib/create_managed_configuration';
import { TaskScheduling } from './task_scheduling';
import { healthRoute } from './routes';
import { createMonitoringStats, MonitoringStats } from './monitoring';

export type TaskManagerSetupContract = { addMiddleware: (middleware: Middleware) => void } & Pick<
  TaskTypeDictionary,
  'registerTaskDefinitions'
>;

export type TaskManagerStartContract = Pick<
  TaskScheduling,
  'schedule' | 'runNow' | 'ensureScheduled'
> &
  Pick<TaskStore, 'fetch' | 'get' | 'remove'>;

export class TaskManagerPlugin
  implements Plugin<TaskManagerSetupContract, TaskManagerStartContract> {
  private taskPollingLifecycle?: TaskPollingLifecycle;
  private taskManagerId?: string;
  private config?: TaskManagerConfig;
  private logger: Logger;
  private definitions: TaskTypeDictionary;
  private middleware: Middleware = createInitialMiddleware();
  private monitoringStats$ = new Subject<MonitoringStats>();

  constructor(private readonly initContext: PluginInitializerContext) {
    this.initContext = initContext;
    this.logger = initContext.logger.get('taskManager');
    this.definitions = new TaskTypeDictionary(this.logger);
  }

  public async setup(core: CoreSetup): Promise<TaskManagerSetupContract> {
    const { logger, monitoringStats$ } = this;
    const config = (this.config = await this.initContext.config
      .create<TaskManagerConfig>()
      .pipe(first())
      .toPromise());

    setupSavedObjects(core.savedObjects, this.config);
    this.taskManagerId = this.initContext.env.instanceUuid;

    if (!this.taskManagerId) {
      this.logger.error(
        `TaskManager is unable to start as there the Kibana UUID is invalid (value of the "server.uuid" configuration is ${this.taskManagerId})`
      );
      throw new Error(`TaskManager is unable to start as Kibana has no valid UUID assigned to it.`);
    } else {
      this.logger.info(`TaskManager is identified by the Kibana UUID: ${this.taskManagerId}`);
    }

    // Routes
    const router = core.http.createRouter();
    const serviceStatus$ = healthRoute(
      router,
      monitoringStats$,
      logger,
      this.taskManagerId,
      // if "hot" health stats are any more stale than monitored_stats_required_freshness (pollInterval +1s buffer by default)
      // consider the system unhealthy
      config.monitored_stats_required_freshness,
      // if "cold" health stats are any more stale than the configured refresh, consider the system unhealthy
      config.monitored_aggregated_stats_refresh_rate + 1000
    );

    core.getStartServices().then(async () => {
      core.status.set(
        combineLatest([core.status.derivedStatus$, serviceStatus$]).pipe(
          map(([derivedStatus, serviceStatus]) =>
            serviceStatus.level > derivedStatus.level ? serviceStatus : derivedStatus
          )
        )
      );
    });

    return {
      addMiddleware: (middleware: Middleware) => {
        this.assertStillInSetup('add Middleware');
        this.middleware = addMiddlewareToChain(this.middleware, middleware);
      },
      registerTaskDefinitions: (taskDefinition: Record<string, TaskDefinition>) => {
        this.assertStillInSetup('register task definitions');
        this.definitions.registerTaskDefinitions(taskDefinition);
      },
    };
  }

  public start({ savedObjects, elasticsearch }: CoreStart): TaskManagerStartContract {
    const savedObjectsRepository = savedObjects.createInternalRepository(['task']);

    const taskStore = new TaskStore({
      serializer: savedObjects.createSerializer(),
      savedObjectsRepository,
      esClient: elasticsearch.createClient('taskManager').asInternalUser,
      index: this.config!.index,
      maxAttempts: this.config!.max_attempts,
      definitions: this.definitions,
      taskManagerId: `kibana:${this.taskManagerId!}`,
    });

    const { maxWorkersConfiguration$, pollIntervalConfiguration$ } = createManagedConfiguration({
      logger: this.logger,
      errors$: taskStore.errors$,
      startingMaxWorkers: this.config!.max_workers,
      startingPollInterval: this.config!.poll_interval,
    });

    const taskPollingLifecycle = new TaskPollingLifecycle({
      config: this.config!,
      definitions: this.definitions,
      logger: this.logger,
      taskStore,
      middleware: this.middleware,
      maxWorkersConfiguration$,
      pollIntervalConfiguration$,
    });
    this.taskPollingLifecycle = taskPollingLifecycle;

    createMonitoringStats(taskPollingLifecycle, taskStore, this.config!, this.logger).subscribe(
      this.monitoringStats$.next
    );

    const taskScheduling = new TaskScheduling({
      logger: this.logger,
      taskStore,
      middleware: this.middleware,
      taskPollingLifecycle,
    });

    // start polling for work
    taskPollingLifecycle.start();

    return {
      fetch: (opts: SearchOpts): Promise<FetchResult> => taskStore.fetch(opts),
      get: (id: string) => taskStore.get(id),
      remove: (id: string) => taskStore.remove(id),
      schedule: (...args) => taskScheduling.schedule(...args),
      ensureScheduled: (...args) => taskScheduling.ensureScheduled(...args),
      runNow: (...args) => taskScheduling.runNow(...args),
    };
  }

  public stop() {
    if (this.taskPollingLifecycle) {
      this.taskPollingLifecycle.stop();
    }
  }

  /**
   * Ensures task manager hasn't started
   *
   * @param {string} the name of the operation being executed
   * @returns void
   */
  private assertStillInSetup(operation: string) {
    if (this.taskPollingLifecycle?.isStarted) {
      throw new Error(`Cannot ${operation} after the task manager has started`);
    }
  }
}
