/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

// There appears to be an unexported implementation of Either in here: src/core/server/saved_objects/service/lib/repository.ts
// Which is basically the Haskel equivalent of Rust/ML/Scala's Result
// I'll reach out to other's in Kibana to see if we can merge these into one type

export interface Ok<T> {
  tag: 'ok';
  value: T;
}

export interface Err<E> {
  tag: 'err';
  error: E;
}
export type Result<T, E> = Ok<T> | Err<E>;

export function asOk<T>(value: T): Ok<T> {
  return {
    tag: 'ok',
    value,
  };
}

export function asErr<T>(error: T): Err<T> {
  return {
    tag: 'err',
    error,
  };
}

export function isOk<T, E>(result: Result<T, E>): result is Ok<T> {
  return result.tag === 'ok';
}

export function isErr<T, E>(result: Result<T, E>): result is Err<E> {
  return !isOk(result);
}

export async function promiseResult<T, E>(future: Promise<T>): Promise<Result<T, E>> {
  try {
    return asOk(await future);
  } catch (e) {
    return asErr(e);
  }
}

export function either<T, E>(
  result: Result<T, E>,
  onOk: (value: T) => void,
  onErr: (error: E) => void
): void {
  resolve<T, E, void>(result, onOk, onErr);
}

export async function eitherAsync<T, E>(
  result: Result<T, E>,
  onOk: (value: T) => Promise<void>,
  onErr: (error: E) => Promise<void>
): Promise<Result<T, E> | void> {
  return await resolve<T, E, Promise<void>>(result, onOk, onErr);
}

export function resolve<T, E, Resolution>(
  result: Result<T, E>,
  onOk: (value: T) => Resolution,
  onErr: (error: E) => Resolution
): Resolution {
  return isOk(result) ? onOk(result.value) : onErr(result.error);
}

export function correctError<T, E, E2>(
  result: Result<T, E>,
  correctErr: (error: E) => Result<T, E2>
): Result<T, E2> {
  return isOk(result) ? result : correctErr(result.error);
}
