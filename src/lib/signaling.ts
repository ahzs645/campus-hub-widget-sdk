/**
 * Signaling client surface.
 *
 * The implementation lives in `@firstform/campus-hub-engine`, which depends on
 * this SDK. These types are declared here rather than re-exported from there
 * so that a widget package can typecheck — and be published, installed and
 * built — with only the SDK present. An external author writing a widget in
 * their own repository should never need the host engine on disk.
 *
 * The engine's own definitions are asserted structurally identical to these by
 * a test in the engine repo, so drift fails there rather than silently at a
 * call site here.
 */

export type SignalingRole = 'display' | 'controller';

export interface SignalingConfig {
  type: 'url' | 'json' | 'configUrl' | 'playlistUrl';
  value: string;
}

export type SignalingEventCallback = (data: Record<string, unknown>) => void;

export interface SignalingClient {
  connect: () => void;
  disconnect: () => void;
  on: (event: string, callback: SignalingEventCallback) => void;
  off: (event: string, callback: SignalingEventCallback) => void;
  pushConfig: (config: SignalingConfig) => void;
  pushAction: (action: string) => void;
  sendHeartbeat: (currentConfig?: string) => void;
  reportStatus: (status: Record<string, unknown>) => void;
  isConnected: () => boolean;
  // Home Assistant bridge
  haSubscribe: (entityIds: string[]) => void;
  haUnsubscribe: (entityIds?: string[]) => void;
  haCallService: (
    domain: string,
    service: string,
    data?: Record<string, unknown>,
    target?: Record<string, unknown>,
  ) => void;
  haGetEntities: (domain?: string) => void;
}

export interface CreateSignalingClientOptions {
  name?: string;
  currentConfig?: string;
  autoReconnect?: boolean;
}

/** Shape the engine module is expected to expose. */
interface SignalingModule {
  createSignalingClient: (
    serverUrl: string,
    role: SignalingRole,
    displayId: string,
    options?: CreateSignalingClientOptions,
  ) => SignalingClient;
}

const ENGINE_SIGNALING = '@firstform/campus-hub-engine/src/lib/signaling-client';

/**
 * Resolve and construct a signaling client.
 *
 * Async because the engine is loaded on demand: a static import would put the
 * whole engine in the bundle of every widget package, and would make the
 * SDK↔engine dependency cycle real at module-evaluation time.
 */
export async function createSignalingClient(
  serverUrl: string,
  role: SignalingRole,
  displayId: string,
  options: CreateSignalingClientOptions = {},
): Promise<SignalingClient> {
  let mod: SignalingModule;
  try {
    // @ts-ignore -- Deliberately unresolved at compile time. The specifier is
    // static so bundlers still emit a chunk for it, but the SDK must typecheck
    // in a project that has no engine installed. The contract is pinned by
    // SignalingModule above and by the engine's conformance test.
    mod = (await import(/* @vite-ignore */ ENGINE_SIGNALING)) as SignalingModule;
  } catch (cause) {
    throw new Error(
      'Signaling requires @firstform/campus-hub-engine, which is provided by the ' +
        'host application. Widgets using it only run inside a Campus Hub host.',
      { cause },
    );
  }
  return mod.createSignalingClient(serverUrl, role, displayId, options);
}
