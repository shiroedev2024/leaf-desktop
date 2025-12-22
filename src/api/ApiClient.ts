import axios, { AxiosInstance } from 'axios';
import { Log } from './Log';
import { SelectReply } from './SelectReply';
import { Stat } from './Stat';
import { UsageReply } from './UsageReply';
import { SelectListReply } from './SelectListReply.ts';
import { OutboundListReply } from './OutboundListReply';
import { OutboundLastPeerActiveReply } from './OutboundLastPeerActiveReply';
import { OutboundSinceLastPeerActiveReply } from './OutboundSinceLastPeerActiveReply';
import { OutboundHealthReply } from './OutboundHealthReply';
import { FailoverStatusReply } from './FailoverStatusReply';
import { CheckConnectivityReply } from './CheckConnectivityReply';

class ApiClient {
  private client: AxiosInstance;

  constructor(port: number = 10001) {
    this.client = axios.create({
      baseURL: `http://127.0.0.1:${port}`,
    });
  }

  public async getUsage(tag: string): Promise<UsageReply> {
    const response = await this.client.get<UsageReply>(
      `/api/v1/runtime/usage/json?tag=${tag}`
    );
    return response.data;
  }

  public async getStats(): Promise<Stat[]> {
    const response = await this.client.get<Stat[]>(`/api/v1/runtime/stat/json`);
    return response.data;
  }

  public async getSelectOutboundItems(tag: string): Promise<SelectListReply> {
    const response = await this.client.get<SelectListReply>(
      `/api/v1/app/outbound/selects?outbound=${tag}`
    );
    return response.data;
  }

  public async getCurrentSelectOutboundItem(tag: string): Promise<SelectReply> {
    const response = await this.client.get<SelectReply>(
      `/api/v1/app/outbound/select?outbound=${tag}`
    );
    return response.data;
  }

  public async setSelectOutboundItem(tag: string, item: string): Promise<void> {
    await this.client.post(
      `/api/v1/app/outbound/select?outbound=${tag}&select=${item}`
    );
  }

  public async getLogs(limit: number, offset: number): Promise<Log> {
    const response = await this.client.get<Log>(
      `/api/v1/runtime/logs/json?limit=${limit}&offset=${offset}`
    );
    return response.data;
  }

  public async clearLogs(): Promise<void> {
    await this.client.post(`/api/v1/runtime/logs/clear`);
  }

  public async reload(): Promise<boolean> {
    const response = await this.client.post(`/api/v1/runtime/reload`);
    return response.status === 200;
  }

  public async shutdown(): Promise<boolean> {
    const response = await this.client.post(`/api/v1/runtime/shutdown`);
    return response.status === 200;
  }

  public async getOutboundList(): Promise<OutboundListReply> {
    const response = await this.client.get<OutboundListReply>(
      `/api/v1/app/outbound/list`
    );
    return response.data;
  }

  public async getOutboundLastPeerActive(
    tag: string
  ): Promise<OutboundLastPeerActiveReply> {
    const response = await this.client.get<OutboundLastPeerActiveReply>(
      `/api/v1/runtime/outbound/${tag}/last_peer_active`
    );
    return response.data;
  }

  public async getOutboundSinceLastPeerActive(
    tag: string
  ): Promise<OutboundSinceLastPeerActiveReply> {
    const response = await this.client.get<OutboundSinceLastPeerActiveReply>(
      `/api/v1/runtime/outbound/${tag}/since_last_peer_active`
    );
    return response.data;
  }

  public async getOutboundHealth(tag: string): Promise<OutboundHealthReply> {
    const response = await this.client.get<OutboundHealthReply>(
      `/api/v1/runtime/outbound/${tag}/health`
    );
    return response.data;
  }

  public async getFailoverStatus(
    outbound: string
  ): Promise<FailoverStatusReply> {
    const response = await this.client.get<FailoverStatusReply>(
      `/api/v1/app/outbound/failover/status?outbound=${outbound}`
    );
    return response.data;
  }

  public async forceFailoverHealthCheck(outbound: string): Promise<boolean> {
    const response = await this.client.post(
      `/api/v1/app/outbound/failover/healthcheck?outbound=${outbound}`
    );
    return response.status === 200;
  }

  public async forceFailoverHealthCheckAll(): Promise<boolean> {
    const response = await this.client.post(
      `/api/v1/app/outbound/failover/healthcheck/all`
    );
    return response.status === 200 || response.status === 202;
  }

  public async checkConnectivity(): Promise<CheckConnectivityReply> {
    const response = await this.client.get<CheckConnectivityReply>(
      `/api/v1/runtime/check_connectivity`
    );
    return response.data;
  }
}

export default ApiClient;
