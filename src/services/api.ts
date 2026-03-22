export const checkDuplicate = async (name: string): Promise<boolean> => {
  const res = await fetch(`/api/check?name=${encodeURIComponent(name.trim())}`);
  if (!res.ok) throw new Error('Failed to check duplicate');
  const data = await res.json();
  return data.submitted;
};

export const submitTest = async (formData: FormData): Promise<void> => {
  const res = await fetch('/api/submit', {
    method: 'POST',
    body: formData
  });
  if (!res.ok) {
    if (res.status === 400) {
      const data = await res.json();
      throw new Error(data.error || 'Bad Request');
    }
    throw new Error('Submission failed');
  }
};

export const fetchRecords = async (): Promise<any[]> => {
  const res = await fetch('/api/records');
  if (!res.ok) throw new Error('Failed to fetch records');
  return res.json();
};
