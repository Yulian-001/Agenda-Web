export const recoveryDurationMs = 5 * 60 * 1000;
export const recoveryResendMs = 60 * 1000;
export const accountLockMs = 15 * 60 * 1000;
export const maxLoginFailures = 5;
export const maxCodeFailures = 5;
export const securePasswordPattern = /^(?=.*[a-z])(?=.*[A-Z])(?=.*[!#$%&/(){}*+<>]).{8,}$/;
export const securePasswordMessage = 'Usa al menos 8 caracteres, con mayúscula, minúscula y un símbolo (!#$%&/(){}*+<>).';
