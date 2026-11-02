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
  /**
   * Shared secret for the signaling server. Sent as the Socket.IO handshake
   * `auth.token`, which the Campus Hub signaling server requires.
   */
  authToken?: string;
}

/** Factory the host's engine provides; see {@link registerSignalingImplementation}. */
export type SignalingClientFactory = (
  serverUrl: string,
  role: SignalingRole,
  displayId: string,
  options?: CreateSignalingClientOptions,
) => SignalingClient;

let registeredFactory: SignalingClientFactory | null = null;

/**
 * Called by the host engine (`@firstform/campus-hub-engine` registers itself
 * when its entry module loads) to supply the signaling implementation.
 *
 * The SDK used to `import()` the engine by a computed specifier, but bundlers
 * cannot rewrite a computed specifier, so production builds shipped a bare
 * `import("@firstform/campus-hub-engine/...")` that browsers can never
 * resolve. Registration keeps the SDK free of an engine dependency without
 * relying on the bundler. A later registration replaces an earlier one.
 */
export function registerSignalingImplementation(factory: SignalingClientFactory | null): void {
  registeredFactory = factory;
}

/** Whether a host has registered a signaling implementation. */
export function hasSignalingImplementation(): boolean {
  return registeredFactory !== null;
}

/**
 * Construct a signaling client using the implementation the host registered.
 *
 * Async for compatibility with earlier SDK versions, which loaded the engine
 * on demand. Rejects when no host engine has registered an implementation.
 */
export async function createSignalingClient(
  serverUrl: string,
  role: SignalingRole,
  displayId: string,
  options: CreateSignalingClientOptions = {},
): Promise<SignalingClient> {
  if (!registeredFactory) {
    throw new Error(
      'Signaling requires @firstform/campus-hub-engine, which is provided by the ' +
        'host application. Widgets using it only run inside a Campus Hub host.',
    );
  }
  return registeredFactory(serverUrl, role, displayId, options);
}
