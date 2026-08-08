import { Hono } from "hono";
import { friendsRoutes } from "./friends/friends.routes";
import { healthRoutes } from "./health/health.routes";
import { meRoutes, paymentRoutes, splitRoutes } from "./payment/payment.route";
import { usersRoutes } from "./users/users.routes";

export const apiV1Router = new Hono();

apiV1Router.route("/health", healthRoutes);
apiV1Router.route("/users", usersRoutes);
apiV1Router.route("/friends", friendsRoutes);
apiV1Router.route("/payments", paymentRoutes);
apiV1Router.route("/splits", splitRoutes);
apiV1Router.route("/me", meRoutes);
