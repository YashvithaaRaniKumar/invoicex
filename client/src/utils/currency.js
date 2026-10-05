/**
 * Format numerical amounts in Indian Rupee format (e.g. ₹2,95,000.00)
 * @param {number|string} amount
 * @returns {string}
 */
export const formatINR = (amount) => {
  if (amount === undefined || amount === null || isNaN(Number(amount))) return '₹0.00';
  const num = Number(amount);
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 2,
    minimumFractionDigits: 2,
  }).format(num);
};

export default formatINR;
