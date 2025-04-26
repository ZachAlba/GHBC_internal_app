export const getCurrentSeason = (): string => {
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth() + 1; 
    return (month >= 6 && month <= 9) ? `S${year}` : `W${year}`;
  };

  export const getSeasonFromDate = (date: string): string => {
    const month = new Date(date).getMonth() + 1; 
    const year = new Date(date).getFullYear();
    return (month >= 6 && month <= 9) ? `S${year}` : `W${year}`;
  }