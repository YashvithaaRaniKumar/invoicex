/**
 * Professional role and actor formatting utility.
 * Ensures the UI displays clean corporate titles instead of personal names.
 */
export const formatActorName = (name) => {
  if (!name) return 'System Operator';
  return name
    .replace(/Priya\s*Nair/gi, 'Finance Specialist')
    .replace(/Amitabh\s*Verma/gi, 'AP Approver')
    .replace(/Rajesh\s*Sharma/gi, 'System Administrator')
    .replace(/\bPriya\b/gi, 'Finance Specialist')
    .replace(/\bAmitabh\b/gi, 'AP Approver')
    .replace(/\bRajesh\b/gi, 'System Administrator');
};

export default formatActorName;
