import { Hono } from "hono";
import { healthRoutes } from "./health/health.routes";
import { paymentRoutes } from "./payment/payment.route";
import { usersRoutes } from "./users/users.routes";

export const apiV1Router = new Hono();

apiV1Router.route("/health", healthRoutes);
apiV1Router.route("/users", usersRoutes);
apiV1Router.route("/payments", paymentRoutes);
