export function useTablePerPage(key, fallback = 10) {
  const allowed = [10, 25, 50, 100]

  const loadPerPage = () => {
    if (!process.client) return fallback
    const v = parseInt(localStorage.getItem(key) || '', 10)
    return allowed.includes(v) ? v : fallback
  }

  const savePerPage = (v) => {
    if (process.client) localStorage.setItem(key, String(v))
  }

  return { loadPerPage, savePerPage }
}
