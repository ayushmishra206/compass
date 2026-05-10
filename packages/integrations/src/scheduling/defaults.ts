import { getUserProfile } from '@compass/core';

export async function getBriefingHour(): Promise<number> {
  return (await getUserProfile()).briefingHour;
}

export async function getReflectionHour(): Promise<number> {
  return (await getUserProfile()).reflectionHour;
}
