// src/utils/urgency.ts

export interface UrgencyInfo {
  bg: string;
  text: string;
  label: string;
  circleColor: string;
}

export function getUrgencyColor(installDate?: any): UrgencyInfo {
  if (!installDate) {
    return { 
      bg: 'bg-gray-100 dark:bg-gray-700', 
      text: 'text-gray-500 dark:text-gray-400', 
      label: 'No Date',
      circleColor: 'bg-gray-400'
    };
  }
  
  const today = new Date();
  const install = installDate.toDate ? installDate.toDate() : new Date(installDate);
  const diffTime = install.getTime() - today.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  
  if (diffDays <= 3) {
    return { 
      bg: 'bg-red-100 dark:bg-red-900/30', 
      text: 'text-red-800 dark:text-red-200', 
      label: `${diffDays}d`,
      circleColor: 'bg-red-500'
    };
  } else if (diffDays <= 7) {
    return { 
      bg: 'bg-orange-100 dark:bg-orange-900/30', 
      text: 'text-orange-800 dark:text-orange-200', 
      label: `${diffDays}d`,
      circleColor: 'bg-orange-500'
    };
  } else if (diffDays <= 14) {
    return { 
      bg: 'bg-yellow-100 dark:bg-yellow-900/30', 
      text: 'text-yellow-800 dark:text-yellow-200', 
      label: `${Math.ceil(diffDays/7)}w`,
      circleColor: 'bg-yellow-500'
    };
  } else if (diffDays <= 21) {
    return { 
      bg: 'bg-cyan-100 dark:bg-cyan-900/30', 
      text: 'text-cyan-800 dark:text-cyan-200', 
      label: `${Math.ceil(diffDays/7)}w`,
      circleColor: 'bg-cyan-500'
    };
  } else {
    return { 
      bg: 'bg-gray-100 dark:bg-gray-700', 
      text: 'text-gray-600 dark:text-gray-300', 
      label: `${Math.ceil(diffDays/7)}w`,
      circleColor: 'bg-gray-400'
    };
  }
}