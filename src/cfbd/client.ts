import { client } from "cfbd";

export function configureCfbdClient(apiKey: string): void {
  client.setConfig({
    headers: {
      Authorization: `Bearer ${apiKey}`,
    },
  });
}
