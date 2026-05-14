export async function saveSession(userId: number, name: string) {
  localStorage.setItem('user_id', String(userId));
  localStorage.setItem('user_name', name);
}

export async function getSession() {
  const user_id   = localStorage.getItem('user_id');
  const user_name = localStorage.getItem('user_name');
  if (!user_id) return null;
  return { user_id: Number(user_id), user_name };
}

export async function clearSession() {
  localStorage.removeItem('user_id');
  localStorage.removeItem('user_name');
}

