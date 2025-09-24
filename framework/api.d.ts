// framework/api.d.ts
export type Ctx = unknown
export type ApiImpl<In, Out> = (props: In, ctx: Ctx) => Promise<Out> | Out

export declare function $api<In, Out>(
  id: string,
  fn: ApiImpl<In, Out>
): (props: In) => Promise<Out>
