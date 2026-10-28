export function readFormValue(data: FormData, key: string) {
  const value = data.get(key)
  return typeof value === 'string' ? value : ''
}
