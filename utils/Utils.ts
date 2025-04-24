export const getCurrentSeason = (): string => {
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth() + 1; // JS months are 0-indexed
    return (month >= 5 && month <= 9) ? `S${year}` : `W${year}`;
  };