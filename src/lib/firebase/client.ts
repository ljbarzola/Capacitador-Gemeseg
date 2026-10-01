"use client";

import { getApp, getApps, initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";

// Configuración pública del cliente (no es secreta). Next la incrusta al compilar.
export function getClientAuth() {
  const app = getApps().length
    ? getApp()
    : initializeApp({
        apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
        authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
        projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
        storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
        messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
        appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
      });
  const auth = getAuth(app);
  auth.languageCode = "es"; // correos de Firebase en español
  return auth;
}

// Mensajes en español para los errores más comunes de Firebase Auth.
export function authErrorMessage(error: unknown): string {
  const code = (error as { code?: string })?.code ?? "";
  switch (code) {
    case "auth/invalid-credential":
    case "auth/user-not-found":
    case "auth/wrong-password":
    case "auth/invalid-email":
      return "Correo o contraseña incorrectos.";
    case "auth/too-many-requests":
      return "Demasiados intentos. Espere unos minutos e intente de nuevo.";
    case "auth/network-request-failed":
      return "Sin conexión. Revise su internet e intente de nuevo.";
    case "auth/user-disabled":
      return "Esta cuenta está deshabilitada. Contacte al administrador.";
    default:
      return "No se pudo completar la operación. Intente de nuevo.";
  }
}
