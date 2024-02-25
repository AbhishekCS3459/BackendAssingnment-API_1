import bodyParser from "body-parser";
import express from "express";
import mongoose from "mongoose";

import router from "./routes/users/userRoutes";

require("dotenv").config();

const app = express();

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

(async () => {
  const DB_URI = process.env.DB_URI || "mongodb://localhost:27017/proelevate";
  try {
    await mongoose.connect(DB_URI, {
      autoIndex: true,
    });
    console.log("Connected to DB");
  } catch (error) {
    console.log("Error connecting to DB", error);
  }
})();
(async () => {
  try {
  } catch (error) {
    console.log(error);
  }
})();
app.get("/", (req, res) => {
  res.json({
    msg: "ok",
  });
});

app.use("/api1/v1/users", router);

app.listen(3000, () => {
  console.log("Server is running on port http://localhost:3000");
});
