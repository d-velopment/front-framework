// framework/api-client.ts
export function $api<In, Out>(id: string, _fn: any) {
    return async function call(props: In): Promise<Out> {
        const r = await fetch(`/api/_rpc/${id}`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(props ?? {})
        })
        if (!r.ok) throw new Error(`API ${id} failed ${r.status}`)
        return r.json()
    }
}
