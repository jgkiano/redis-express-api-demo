// envs
// REDIS_HOST, REDIS_PORT, NODE_PORT || PORT, HOST

const express = require("express");
const { promisify } = require("util");
const bodyParser = require("body-parser");
const morgan = require("morgan");
const redis = require("redis");
const { v4: uuidv4 } = require("uuid");

const redisClient = redis.createClient({
  host: process.env.REDIS_HOST || "127.0.0.1",
  port: process.env.REDIS_PORT || "6379",
});

redisClient.on("error", function (error) {
  console.error(error);
});

const app = express();
const port = process.env.NODE_PORT || process.env.PORT || 3000;
const host = process.env.HOST || "127.0.0.1";

app.use(bodyParser.json());
app.use(morgan("short"));

app.get("/", (req, res) => res.json({ message: "API alive 🥳" }));

app.get("/users", (req, res) => {
  redisClient.keys("user:*", async (err, reply) => {
    if (err) return res.status(500).send(err.message);
    const keys = reply.length ? reply : [];
    const getAsync = promisify(redisClient.get).bind(redisClient);
    let users = keys.map((key) => getAsync(key));
    users = await Promise.all(users);
    users = users.map((user) => JSON.parse(user));
    res.json(users);
  });
});

app.get("/users/count", (req, res) => {
  redisClient.keys("user:*", async (err, reply) => {
    if (err) return res.status(500).send(err.message);
    const keys = reply.length ? reply : [];
    return res.send(keys.length.toString());
  });
});

app.get("/users/:id", (req, res) => {
  redisClient.get("user:" + req.params.id, (err, reply) => {
    if (err) return res.status(500).send(err.message);
    return res.json(JSON.parse(reply));
  });
});

app.post("/users", (req, res) => {
  const id = uuidv4();
  const { firstName, lastName, phone } = req.body;
  if (!firstName || !lastName || !phone)
    return res.status(400).send({ message: "Invalid parameters" });
  const user = {
    firstName,
    lastName,
    phone,
    id,
  };
  redisClient.set("user:" + id, JSON.stringify(user), (err, reply) => {
    if (err) return res.status(500).send(err.message);
    return res.send(reply);
  });
});

app.delete("/users", (req, res) => {
  redisClient.keys("user:*", async (err, reply) => {
    if (err) return res.status(500).send(err.message);
    const keys = reply.length ? reply : [];
    const delAsync = promisify(redisClient.del).bind(redisClient);
    const users = keys.map((key) => delAsync(key));
    Promise.all(users);
    res.send("OK");
  });
});

app.listen(port, host, () => console.log("server running on: " + port));
