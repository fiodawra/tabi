"use client";

import { ArrowRight } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import type { ComponentType } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useTranslations } from "@/hooks/use-i18n";
import { useToastOperation } from "@/hooks/use-toast-operation";
import { AuthDomainError, useAuth } from "@/stores/auth-store";

type LandingItem = {
  icon: ComponentType<{ className?: string }>;
  key: string;
};

export function HomePageClient() {
  const t = useTranslations("HomePage");
  const runToastOperation = useToastOperation();
  const { isLoading, signInWithGoogle, user } = useAuth();

  function handleSignIn() {
    void runToastOperation(() => signInWithGoogle(), {
      error: (error) =>
        error instanceof AuthDomainError
          ? "signInUnauthorizedDomain"
          : "signInFailed",
      success: (result) => (result === "signed-in" ? "signInSuccess" : false),
    }).catch(() => undefined);
  }

  return (
    <main className="flex w-full flex-col gap-8">
      <section className="relative left-1/2 min-h-[min(680px,74svh)] w-screen -translate-x-1/2 overflow-hidden ">
        <Image
          src="/tabi-journey-hero.png"
          alt={t("hero.imageAlt")}
          fill
          priority
          sizes="100vw"
          className="object-cover"
        />
        <div className="absolute inset-0 bg-background/82" />
        <div className="absolute inset-0 bg-linear-to-r from-background via-background/60 to-background/10" />

        <div className="relative mx-auto flex min-h-[min(680px,74svh)] w-full max-w-6xl items-center px-4 py-12 sm:px-6 lg:px-8">
          <div className="flex max-w-2xl flex-col items-start gap-5">
            <Badge
              variant="secondary"
              className="rounded-md"
            >
              {t("hero.eyebrow")}
            </Badge>
            <div className="flex flex-col gap-3">
              <h1 className="max-w-xl text-balance font-heading font-semibold text-4xl leading-tight tracking-normal sm:text-5xl lg:text-6xl">
                {t("hero.title")}
              </h1>
              <p className="max-w-lg text-base text-muted-foreground leading-7 sm:text-lg">
                {t("hero.description")}
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {user ? (
                <Button
                  asChild
                  size="lg"
                >
                  <Link href="/itinerary">
                    {t("hero.ctaSignedIn")}
                    <ArrowRight data-icon="inline-end" />
                  </Link>
                </Button>
              ) : (
                <Button
                  type="button"
                  size="lg"
                  onClick={handleSignIn}
                  disabled={isLoading}
                >
                  {t("hero.ctaSignedOut")}
                  <ArrowRight data-icon="inline-end" />
                </Button>
              )}
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
