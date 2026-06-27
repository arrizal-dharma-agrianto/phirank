import { mailDriver } from "@/lib/mail";
import { SendMailParams } from "../types";

const sendMail = async (
  params: SendMailParams,
) => {
  await mailDriver.send(params);
};

export { sendMail };