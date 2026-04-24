require("dotenv").config();
const http = require("http");
const app = require("./app");
const connectDb = require("./config/db");
const setupSocket = require("./socket");

const port = Number(process.env.PORT || 5000);
const server = http.createServer(app);
const io = setupSocket(server);
app.set("io", io);

connectDb()
  .then(() => {
    server.listen(port, () => {
      console.log(`Server running on port ${port}`);
    });
  })
  .catch((error) => {
    console.error("Failed to start server", error);
    process.exit(1);
  });
