/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import _ from 'lodash';
import expect from '@kbn/expect';
import url from 'url';
import supertestAsPromised from 'supertest-as-promised';

const { task: { properties: taskManagerIndexMapping } } = require('../../../../legacy/plugins/task_manager/mappings.json');

export default function ({ getService }) {
  const es = getService('legacyEs');
  const log = getService('log');
  const retry = getService('retry');
  const config = getService('config');
  const testHistoryIndex = '.kibana_task_manager_test_result';
  const supertest = supertestAsPromised(url.format(config.get('servers.kibana')));

  describe('scheduling and running tasks', () => {
    beforeEach(() => supertest.delete('/api/sample_tasks')
      .set('kbn-xsrf', 'xxx')
      .expect(200));

    beforeEach(async () => {
      const exists = await es.indices.exists({ index: testHistoryIndex });
      if (exists) {
        await es.deleteByQuery({
          index: testHistoryIndex,
          q: 'type:task',
          refresh: true,
        });
      } else {
        await es.indices.create({
          index: testHistoryIndex,
          body: {
            mappings: {
              properties: taskManagerIndexMapping
            },
          },
        });
      }
    });

    function currentTasks() {
      return supertest.get('/api/sample_tasks')
        .expect(200)
        .then((response) => response.body);
    }

    function historyDocs() {
      return es.search({
        index: testHistoryIndex,
        q: 'type:task',
      }).then(result => result.hits.hits);
    }

    function scheduleTask(task) {
      return supertest.post('/api/sample_tasks/schedule')
        .set('kbn-xsrf', 'xxx')
        .send({ task })
        .expect(200)
        .then((response) => response.body);
    }

    function runTaskNow(task) {
      return supertest.post('/api/sample_tasks/run_now')
        .set('kbn-xsrf', 'xxx')
        .send({ task })
        .expect(200)
        .then((response) => response.body);
    }

    function scheduleTaskIfNotExists(task) {
      return supertest.post('/api/sample_tasks/ensure_scheduled')
        .set('kbn-xsrf', 'xxx')
        .send({ task })
        .expect(200)
        .then((response) => response.body);
    }

    function releaseTasksWaitingForEventToComplete(event) {
      return supertest.post('/api/sample_tasks/event')
        .set('kbn-xsrf', 'xxx')
        .send({ event })
        .expect(200);
    }

    function getTaskById(tasks, id) {
      return tasks.filter(task => task.id === id)[0];
    }

    async function provideParamsToTasksWaitingForParams(taskId, data = {}) {
      // wait for task to start running and stall on waitForParams
      await retry.try(async () => {
        const tasks = (await currentTasks()).docs;
        expect(getTaskById(tasks, taskId).status).to.eql('running');
      });

      return supertest.post('/api/sample_tasks/event')
        .set('kbn-xsrf', 'xxx')
        .send({ event: taskId, data })
        .expect(200);
    }

    it('should support middleware', async () => {
      const historyItem = _.random(1, 100);

      const scheduledTask = await scheduleTask({
        taskType: 'sampleTask',
        recurringSchedule: '30m',
        params: { historyItem },
      });
      log.debug(`Task created: ${scheduledTask.id}`);

      await retry.try(async () => {
        expect((await historyDocs()).length).to.eql(1);

        const [task] = (await currentTasks()).docs;
        log.debug(`Task found: ${task.id}`);
        log.debug(`Task status: ${task.status}`);
        log.debug(`Task state: ${JSON.stringify(task.state, null, 2)}`);
        log.debug(`Task params: ${JSON.stringify(task.params, null, 2)}`);

        expect(task.state.count).to.eql(1);

        expect(task.params).to.eql({
          superFly: 'My middleware param!',
          originalParams: { historyItem },
        });
      });
    });

    it('should remove non-recurring tasks after they complete', async () => {
      await scheduleTask({
        taskType: 'sampleTask',
        params: { },
      });

      await retry.try(async () => {
        const history = await historyDocs();
        expect(history.length).to.eql(1);
        expect((await currentTasks()).docs).to.eql([]);
      });
    });

    it('should use a given ID as the task document ID', async () => {
      const result = await scheduleTask({
        id: 'test-task-for-sample-task-plugin-to-test-task-manager',
        taskType: 'sampleTask',
        params: { },
      });

      expect(result.id).to.be('test-task-for-sample-task-plugin-to-test-task-manager');
    });

    it('should allow a task with a given ID to be scheduled multiple times', async () => {
      const result = await scheduleTaskIfNotExists({
        id: 'test-task-to-reschedule-in-task-manager',
        taskType: 'sampleTask',
        params: { },
      });

      expect(result.id).to.be('test-task-to-reschedule-in-task-manager');

      const rescheduleResult = await scheduleTaskIfNotExists({
        id: 'test-task-to-reschedule-in-task-manager',
        taskType: 'sampleTask',
        params: { },
      });

      expect(rescheduleResult.id).to.be('test-task-to-reschedule-in-task-manager');
    });

    it('should reschedule if task errors', async () => {
      const task = await scheduleTask({
        taskType: 'sampleTask',
        params: { failWith: 'Dangit!!!!!' },
      });

      await retry.try(async () => {
        const [scheduledTask] = (await currentTasks()).docs;
        expect(scheduledTask.id).to.eql(task.id);
        expect(scheduledTask.attempts).to.be.greaterThan(0);
        expect(Date.parse(scheduledTask.runAt)).to.be.greaterThan(Date.parse(task.runAt) + 5 * 60 * 1000);
      });
    });

    it('should reschedule if task returns runAt', async () => {
      const nextRunMilliseconds = _.random(60000, 200000);
      const count = _.random(1, 20);

      const originalTask = await scheduleTask({
        taskType: 'sampleTask',
        params: { nextRunMilliseconds },
        state: { count },
      });

      await retry.try(async () => {
        expect((await historyDocs()).length).to.eql(1);

        const [task] = (await currentTasks()).docs;
        expect(task.attempts).to.eql(0);
        expect(task.state.count).to.eql(count + 1);

        expectReschedule(Date.parse(originalTask.runAt), task, nextRunMilliseconds);
      });
    });

    it('should reschedule if task has an interval', async () => {
      const interval = _.random(5, 200);
      const intervalMilliseconds = interval * 60000;

      const originalTask = await scheduleTask({
        taskType: 'sampleTask',
        recurringSchedule: `${interval}m`,
        params: { },
      });

      await retry.try(async () => {
        expect((await historyDocs()).length).to.eql(1);

        const [task] = (await currentTasks()).docs;
        expect(task.attempts).to.eql(0);
        expect(task.state.count).to.eql(1);

        expectReschedule(Date.parse(originalTask.runAt), task, intervalMilliseconds);
      });
    });

    it('should return a task run result when asked to run a task now', async () => {

      const originalTask = await scheduleTask({
        taskType: 'sampleTask',
        recurringSchedule: `30m`,
        params: { },
      });

      await retry.try(async () => {
        const docs = await historyDocs();
        expect(docs.filter(taskDoc => taskDoc._source.taskId === originalTask.id).length).to.eql(1);

        const [task] = (await currentTasks()).docs.filter(taskDoc => taskDoc.id === originalTask.id);

        expect(task.state.count).to.eql(1);

        // ensure this task shouldnt run for another half hour
        expectReschedule(Date.parse(originalTask.runAt), task, 30 * 60000);

      });

      const now = Date.now();
      const runNowResult  = await runTaskNow({
        id: originalTask.id
      });

      expect(runNowResult).to.eql({ id: originalTask.id });


      await retry.try(async () => {
        expect((await historyDocs()).filter(taskDoc => taskDoc._source.taskId === originalTask.id).length).to.eql(2);

        const [task] = (await currentTasks()).docs.filter(taskDoc => taskDoc.id === originalTask.id);
        expect(task.state.count).to.eql(2);

        // ensure this task shouldnt run for another half hour
        expectReschedule(now, task, 30 * 60000);

      });
    });

    it('should return a task run error result when running a task now fails', async () => {
      const originalTask = await scheduleTask({
        taskType: 'sampleTask',
        recurringSchedule: `30m`,
        params: {  failWith: 'error on run now', failOn: 3 },
      });

      await retry.try(async () => {
        const docs = await historyDocs();
        expect(docs.filter(taskDoc => taskDoc._source.taskId === originalTask.id).length).to.eql(1);

        const [task] = (await currentTasks()).docs.filter(taskDoc => taskDoc.id === originalTask.id);

        expect(task.state.count).to.eql(1);

        // ensure this task shouldnt run for another half hour
        expectReschedule(Date.parse(originalTask.runAt), task, 30 * 60000);

      });

      // second run should still be successful
      const successfulRunNowResult  = await runTaskNow({
        id: originalTask.id
      });
      expect(successfulRunNowResult).to.eql({ id: originalTask.id });

      await retry.try(async () => {
        const [task] = (await currentTasks()).docs.filter(taskDoc => taskDoc.id === originalTask.id);
        expect(task.state.count).to.eql(2);
      });

      // third run should fail
      const failedRunNowResult  = await runTaskNow({
        id: originalTask.id
      });

      expect(
        failedRunNowResult
      ).to.eql(
        { id: originalTask.id, error: `Error: error on run now` }
      );

      await retry.try(async () => {
        expect((await historyDocs()).filter(taskDoc => taskDoc._source.taskId === originalTask.id).length).to.eql(2);

        const [task] = (await currentTasks()).docs.filter(taskDoc => taskDoc.id === originalTask.id);
        expect(task.attempts).to.eql(1);

      });
    });

    it('should return a task run error result when trying to run a non-existent task', async () => {
      // runNow should fail
      const failedRunNowResult  = await runTaskNow({
        id: 'i-dont-exist'
      });
      expect(failedRunNowResult).to.eql({ error: `Error: Failed to run task "i-dont-exist" as it does not exist`, id: 'i-dont-exist' });
    });

    it('should return a task run error result when trying to run a task now which is already running', async () => {
      const longRunningTask = await scheduleTask({
        taskType: 'sampleTask',
        recurringSchedule: '30m',
        params: {
          waitForParams: true
        },
      });

      // tell the task to wait for the 'runNowHasBeenAttempted' event
      await provideParamsToTasksWaitingForParams(longRunningTask.id, {
        waitForEvent: 'runNowHasBeenAttempted'
      });

      await retry.try(async () => {
        const docs = await historyDocs();
        expect(docs.filter(taskDoc => taskDoc._source.taskId === longRunningTask.id).length).to.eql(1);
      });

      // first runNow should fail
      const failedRunNowResult = await runTaskNow({
        id: longRunningTask.id
      });

      expect(
        failedRunNowResult
      ).to.eql(
        { error: `Error: Failed to run task "${longRunningTask.id}" as it is currently running`, id: longRunningTask.id }
      );

      // finish first run by emitting 'runNowHasBeenAttempted' event
      await releaseTasksWaitingForEventToComplete('runNowHasBeenAttempted');
      await retry.try(async () => {
        const tasks = (await currentTasks()).docs;
        expect(getTaskById(tasks, longRunningTask.id).state.count).to.eql(1);
      });

      // second runNow should be successful
      const successfulRunNowResult = runTaskNow({
        id: longRunningTask.id
      });

      await provideParamsToTasksWaitingForParams(longRunningTask.id);

      expect(await successfulRunNowResult).to.eql({ id: longRunningTask.id });
    });

    it('should allow a failed task to be rerun using runNow', async () => {

      const taskThatFailsBeforeRunNow = await scheduleTask({
        taskType: 'singleAttemptSampleTask',
        params: {
          waitForParams: true
        },
      });

      // tell the task to fail on its next run
      await provideParamsToTasksWaitingForParams(
        taskThatFailsBeforeRunNow.id,
        { failWith: 'error on first run' }
      );

      // wait for task to fail
      await retry.try(async () => {
        const tasks = (await currentTasks()).docs;
        expect(getTaskById(tasks, taskThatFailsBeforeRunNow.id).status).to.eql('failed');
      });

      // runNow should be successfully run the failing task
      const runNowResultWithExpectedFailure = runTaskNow({
        id: taskThatFailsBeforeRunNow.id
      });

      // release the task without failing this time
      await provideParamsToTasksWaitingForParams(taskThatFailsBeforeRunNow.id);

      expect(
        await runNowResultWithExpectedFailure
      ).to.eql(
        { id: taskThatFailsBeforeRunNow.id }
      );
    });

    async function expectReschedule(originalRunAt, currentTask, expectedDiff) {
      const buffer = 10000;
      expect(Date.parse(currentTask.runAt) - originalRunAt).to.be.greaterThan(expectedDiff - buffer);
      expect(Date.parse(currentTask.runAt) - originalRunAt).to.be.lessThan(expectedDiff + buffer);
    }

    it('should run tasks in parallel, allowing for long running tasks along side faster tasks', async () => {
      /**
       * It's worth noting this test relies on the /event endpoint that forces Task Manager to hold off
       * on completing a task until a call is made by the test suite.
       * If we begin testing with multiple Kibana instacnes in Parallel this will likely become flaky.
       * If you end up here because the test is flaky, this might be why.
       */
      const fastTask = await scheduleTask({
        taskType: 'sampleTask',
        recurringSchedule: `1s`,
        params: { },
      });

      const longRunningTask = await scheduleTask({
        taskType: 'sampleTask',
        recurringSchedule: `1s`,
        params: {
          waitForEvent: 'rescheduleHasHappened'
        },
      });

      await retry.try(async () => {
        const tasks = (await currentTasks()).docs;
        expect(getTaskById(tasks, fastTask.id).state.count).to.eql(2);
      });

      await releaseTasksWaitingForEventToComplete('rescheduleHasHappened');

      await retry.try(async () => {
        const tasks = (await currentTasks()).docs;

        expect(getTaskById(tasks, fastTask.id).state.count).to.greaterThan(2);
        expect(getTaskById(tasks, longRunningTask.id).state.count).to.eql(1);
      });
    });
  });
}
