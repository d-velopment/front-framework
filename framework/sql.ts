// framework/sql.ts
export type SqlQuery = { text: string; values: any[] }

export function sql(strings: TemplateStringsArray, ...values: any[]): SqlQuery {
  let text = ""
  for (let i = 0; i < strings.length; i++) {
    text += strings[i]
    if (i < strings.length - 1) text += `$${i + 1}`
  }
  return { text, values }
}
