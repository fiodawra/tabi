"use client";

import { LogOut } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { AuthDomainError, useAuth } from "@/stores/auth-store";
import { useTranslations } from "@/hooks/use-i18n";
import { useUserProfile } from "@/hooks/use-user-profile";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Textarea } from "@/components/ui/textarea";

export function HeaderAuth() {
  const { user, signInWithGoogle, signOutUser } = useAuth();
  const { profile, isProfileLoading, isUpdatingProfile, updateProfile } =
    useUserProfile();
  const t = useTranslations("Auth");
  const tToast = useTranslations("OperationToast");
  const [name, setName] = useState("");
  const [bio, setBio] = useState("");
  const [isEditProfileOpen, setIsEditProfileOpen] = useState(false);
  const fallback =
    user?.displayName?.slice(0, 1).toUpperCase() ??
    user?.email?.slice(0, 1).toUpperCase() ??
    "U";

  useEffect(() => {
    setName(profile?.name ?? user?.displayName ?? "");
    setBio(profile?.bio ?? "");
  }, [profile, user?.displayName]);

  async function handleSaveProfile() {
    if (!user) {
      return;
    }

    try {
      await updateProfile({
        name: name.trim(),
        bio: bio.trim(),
      });
      toast.success(tToast("profileSaved"));
    } catch {
      toast.error(tToast("profileSaveFailed"));
    }
  }

  async function handleSignIn() {
    try {
      const result = await signInWithGoogle();
      if (result === "signed-in") {
        toast.success(tToast("signInSuccess"));
      }
    } catch (error) {
      toast.error(
        error instanceof AuthDomainError
          ? tToast("signInUnauthorizedDomain")
          : tToast("signInFailed"),
      );
    }
  }

  async function handleSignOut() {
    try {
      await signOutUser();
      toast.success(tToast("signOutSuccess"));
    } catch {
      toast.error(tToast("signOutFailed"));
    }
  }

  if (!user) {
    return (
      <Button
        type="button"
        size="sm"
        onClick={() => void handleSignIn()}
      >
        {t("signInWithGoogle")}
      </Button>
    );
  }

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            className="h-9 w-9 rounded-full p-0"
            aria-label={t("menuAriaLabel")}
          >
            <Avatar className="h-8 w-8">
              <AvatarImage
                src={user.photoURL ?? undefined}
                alt={user.displayName ?? t("avatarAlt")}
              />
              <AvatarFallback>{fallback}</AvatarFallback>
            </Avatar>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-64">
          <DropdownMenuLabel className="space-y-1">
            <div className="text-sm font-medium">
              {profile?.name || user.displayName || t("avatarAlt")}
            </div>
            <div className="text-xs text-muted-foreground">{user.email}</div>
            <Badge variant="secondary" className="mt-1">
              {profile?.level === "admin" ? t("admin") : t("member")}
            </Badge>
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuItem asChild>
            <Link href="/feedback">{t("feedback")}</Link>
          </DropdownMenuItem>
          {profile?.level === "admin" ? (
            <DropdownMenuItem asChild>
              <Link href="/dashboard">{t("dashboard")}</Link>
            </DropdownMenuItem>
          ) : null}
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={() => setIsEditProfileOpen(true)}>
            {t("editProfile")}
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => void handleSignOut()}>
            <LogOut className="h-4 w-4" />
            {t("signOut")}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <Sheet open={isEditProfileOpen} onOpenChange={setIsEditProfileOpen}>
        <SheetContent side="right">
        <SheetHeader>
          <SheetTitle>{t("editProfile")}</SheetTitle>
          <SheetDescription>{user.email ?? ""}</SheetDescription>
        </SheetHeader>
        <div className="px-6 space-y-4">
          <div className="space-y-2">
            <Label htmlFor="profile-name">{t("name")}</Label>
            <Input
              id="profile-name"
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder={t("namePlaceholder")}
              disabled={isProfileLoading || isUpdatingProfile}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="profile-bio">{t("bio")}</Label>
            <Textarea
              id="profile-bio"
              value={bio}
              onChange={(event) => setBio(event.target.value)}
              placeholder={t("bioPlaceholder")}
              disabled={isProfileLoading || isUpdatingProfile}
            />
          </div>
        </div>
        <SheetFooter>
          <SheetClose asChild>
            <Button
              type="button"
              variant="ghost"
            >
              {t("cancel")}
            </Button>
          </SheetClose>
          <Button
            type="button"
            onClick={async () => {
              await handleSaveProfile();
              setIsEditProfileOpen(false);
            }}
            disabled={isProfileLoading || isUpdatingProfile}
          >
            {isUpdatingProfile ? t("saving") : t("save")}
          </Button>
        </SheetFooter>
        </SheetContent>
      </Sheet>
    </>
  );
}
