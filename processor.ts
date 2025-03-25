import { SERVICE_CLIENT } from "./service_client";
import { newDeleteExpiredSessionsRequest } from "@phading/user_session_service_interface/node/client";

export async function process(): Promise<void> {
  await SERVICE_CLIENT.send(newDeleteExpiredSessionsRequest({}));
}
