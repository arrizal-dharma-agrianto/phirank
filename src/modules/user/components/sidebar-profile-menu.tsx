"use client";

import {
  DotsThreeOutlineVerticalIcon,
  PencilSimpleLineIcon,
  SignOutIcon,
} from "@phosphor-icons/react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { getPublicObjectUrl } from "@/lib/storage-url";
import { cn, initials } from "@/lib/utils";
import { LogoutButton } from "@/modules/auth/components/logout-button";

import { useProfile } from "../hooks";

interface SidebarProfileMenuProps {
  isOpen: boolean;
}

const ACCOUNT_HREF = "/account";

const getDisplayName = (name: string | null | undefined) => {
  const trimmedName = name?.trim();

  return trimmedName ? trimmedName : "User";
};

const getDisplayEmail = (email: string | null | undefined) => {
  const trimmedEmail = email?.trim();

  return trimmedEmail ? trimmedEmail : "No email";
};

export function SidebarProfileMenu({ isOpen }: SidebarProfileMenuProps) {
  const pathname = usePathname();
  const [profileMenuState, setProfileMenuState] = useState({
    isOpen: false,
    pathname,
    sidebarOpen: isOpen,
  });
  const profileMenuRef = useRef<HTMLDivElement>(null);
  const { data, isLoading } = useProfile();

  const displayName = isLoading ? "Loading..." : getDisplayName(data?.name);
  const displayEmail = isLoading
    ? "Fetching profile..."
    : getDisplayEmail(data?.email);
  const imageSrc = data?.image ? getPublicObjectUrl(data.image) : undefined;
  const isAccountPage =
    pathname === ACCOUNT_HREF || pathname?.startsWith(`${ACCOUNT_HREF}/`);
  const isProfileMenuOpen =
    profileMenuState.isOpen &&
    profileMenuState.pathname === pathname &&
    profileMenuState.sidebarOpen === isOpen;

  const setIsProfileMenuOpen = useCallback(
    (nextOpen: boolean) => {
      setProfileMenuState({
        isOpen: nextOpen,
        pathname,
        sidebarOpen: isOpen,
      });
    },
    [isOpen, pathname],
  );

  useEffect(() => {
    if (!isProfileMenuOpen) {
      return;
    }

    const handlePointerDown = (event: PointerEvent) => {
      if (!profileMenuRef.current?.contains(event.target as Node)) {
        setIsProfileMenuOpen(false);
      }
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsProfileMenuOpen(false);
      }
    };

    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isProfileMenuOpen, setIsProfileMenuOpen]);

  return (
    <div
      ref={profileMenuRef}
      className="relative border-t border-gray-100 pt-3"
    >
      {isProfileMenuOpen ? (
        <div
          className={cn(
            "absolute z-10 space-y-1 rounded-xl border border-gray-200 bg-white p-2 shadow-lg shadow-gray-950/5",
            isOpen
              ? "inset-x-0 bottom-full mb-2"
              : "bottom-0 left-full ml-2 w-48",
          )}
        >
          <Button
            asChild
            variant="ghost"
            className={cn(
              "w-full justify-start rounded-lg text-gray-700 hover:bg-gray-50 hover:text-gray-900",
              isAccountPage && "bg-gray-50 text-gray-900",
            )}
          >
            <Link
              href={ACCOUNT_HREF}
              onClick={() => setIsProfileMenuOpen(false)}
            >
              <PencilSimpleLineIcon aria-hidden="true" className="size-4" />
              Edit Profile
            </Link>
          </Button>
          <LogoutButton
            variant="outline"
            className="w-full justify-start rounded-lg border-gray-200 text-gray-700 hover:bg-gray-50 hover:text-gray-900"
          >
            <SignOutIcon aria-hidden="true" className="size-4" />
            Logout
          </LogoutButton>
        </div>
      ) : null}

      <Button
        type="button"
        variant="ghost"
        aria-label="Open account menu"
        aria-haspopup="menu"
        aria-expanded={isProfileMenuOpen}
        title={!isOpen ? displayName : undefined}
        className={cn(
          "h-auto w-full rounded-lg py-2 font-normal hover:bg-gray-50",
          isOpen ? "justify-start gap-3 px-3" : "justify-center px-0",
          (isProfileMenuOpen || isAccountPage) && "bg-gray-50",
        )}
        onClick={() => setIsProfileMenuOpen(!isProfileMenuOpen)}
      >
        <Avatar className="size-7 shrink-0 after:border-0">
          <AvatarImage src={imageSrc} alt={displayName} />
          <AvatarFallback className="bg-gradient-to-br from-gray-500 to-gray-800 text-xs font-bold text-white">
            {initials(displayName)}
          </AvatarFallback>
        </Avatar>

        {isOpen ? (
          <>
            <div className="flex-1 text-left">
              <p className="truncate text-sm font-medium leading-none text-gray-800">
                {displayName}
              </p>
              <p className="mt-0.5 truncate text-xs text-gray-400">
                {displayEmail}
              </p>
            </div>
            <DotsThreeOutlineVerticalIcon
              aria-hidden="true"
              className="size-3.5 text-gray-400"
              weight="fill"
            />
          </>
        ) : null}
      </Button>
    </div>
  );
}
