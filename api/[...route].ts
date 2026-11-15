import { createApiApp } from '../server/createApp.ts';

const app = createApiApp();

export default function handler(req: any, res: any) {
  return app(req, res);
}
