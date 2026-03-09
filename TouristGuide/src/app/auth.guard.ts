import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';

export const authGuard: CanActivateFn = (route, state) => {
  const router = inject(Router);
  const token = localStorage.getItem('token'); // Ελέγχει αν ο χρήστης έχει κάνει login

  if (token) {
    return true; // Έχει token, επιτρέπεται η είσοδος
  } else {
    router.navigate(['/login']); // Δεν έχει token, πήγαινέ τον στο login
    return false;
  }
};