/* eslint-disable no-promise-executor-return */

import { test, expect } from "@jest/globals";
import { createClient, RedisClientType } from "redis";
import { HumanMessage, AIMessage } from "@langchain/core/messages";
import { GenericContainer, StartedTestContainer } from "testcontainers";
import { RedisChatMessageHistory } from "../chat_histories.js";

let container: StartedTestContainer;
let client: RedisClientType;
beforeAll(async () => {
  container = await new GenericContainer("redis/redis-stack:latest").withExposedPorts(6379).start();
  client = createClient({ url: `redis://${container.getHost()}:${container.getMappedPort(6379)}` });
  await client.connect();
});

afterAll(async () => {
  await client.quit();
  await container.stop();
});

/**
 * To run this integration test, you need to have a Redis server running locally.
 *
 * `docker run -p 6379:6379 -p 8001:8001 redis/redis-stack:latest`
 */

test("Test Redis history store", async () => {
  const chatHistory = new RedisChatMessageHistory({
    sessionId: new Date().toISOString(),
    client
  });

  const blankResult = await chatHistory.getMessages();
  expect(blankResult).toStrictEqual([]);

  await chatHistory.addUserMessage("Who is the best vocalist?");
  await chatHistory.addAIChatMessage("Ozzy Osbourne");

  const expectedMessages = [
    new HumanMessage("Who is the best vocalist?"),
    new AIMessage("Ozzy Osbourne"),
  ];

  const resultWithHistory = await chatHistory.getMessages();
  expect(resultWithHistory).toEqual(expectedMessages);
});

test("Test clear Redis history store", async () => {
  const chatHistory = new RedisChatMessageHistory({
    sessionId: new Date().toISOString(),
    client
  });

  await chatHistory.addUserMessage("Who is the best vocalist?");
  await chatHistory.addAIChatMessage("Ozzy Osbourne");

  const expectedMessages = [
    new HumanMessage("Who is the best vocalist?"),
    new AIMessage("Ozzy Osbourne"),
  ];

  const resultWithHistory = await chatHistory.getMessages();
  expect(resultWithHistory).toEqual(expectedMessages);

  await chatHistory.clear();

  const blankResult = await chatHistory.getMessages();
  expect(blankResult).toStrictEqual([]);
});

test("Test Redis history with a TTL", async () => {
  const chatHistory = new RedisChatMessageHistory({
    sessionId: new Date().toISOString(),
    sessionTTL: 5,
    client
  });

  const blankResult = await chatHistory.getMessages();
  expect(blankResult).toStrictEqual([]);

  await chatHistory.addUserMessage("Who is the best vocalist?");
  await chatHistory.addAIChatMessage("Ozzy Osbourne");

  const expectedMessages = [
    new HumanMessage("Who is the best vocalist?"),
    new AIMessage("Ozzy Osbourne"),
  ];

  const resultWithHistory = await chatHistory.getMessages();
  expect(resultWithHistory).toEqual(expectedMessages);

  await new Promise((resolve) => setTimeout(resolve, 6000));

  const expiredResult = await chatHistory.getMessages();
  expect(expiredResult).toStrictEqual([]);
});
