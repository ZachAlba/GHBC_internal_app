export const getCurrentSeason = (): string => {
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth() + 1; 
    return (month >= 6 && month <= 9) ? `S${year}` : `W${year}`;
  };