import dotenv from "dotenv";
import { app } from "./app";
import { logger } from "./middlewares/logger.middleware";
import { errorHandler } from "./middlewares/error.middleware";

dotenv.config();
const port: number = parseInt(process.env.BACKEND_PORT || "3001", 10);

app.use(errorHandler);

app.listen(port, () => {
  logger.info(`Server is running on port ${port}`);
});

