/// <reference path="../.astro/types.d.ts" />

declare namespace App {
  interface Locals {
    user?: {
      id: string;
      email: string;
      role: 'admin' | 'client';
      fullName: string;
    };
    accessToken?: string;
    lang?: 'es' | 'en';
  }
}