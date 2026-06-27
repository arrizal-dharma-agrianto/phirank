"use client";

import { useState } from "react";
import { signOut } from "next-auth/react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useDeleteAccount } from "../hooks/use-delete-account";

const CONFIRM_TEXT = "Confirm Delete Account";

export function DeleteAccountButton() {
  const deleteAccountMutation = useDeleteAccount();

  const [confirmText, setConfirmText] = useState("");

  async function handleDelete() {
    await deleteAccountMutation.mutateAsync();

    await signOut({
      callbackUrl: "/login",
    });
  }

  const isMatched = confirmText === CONFIRM_TEXT;

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="destructive">
          Delete Account
        </Button>
      </DialogTrigger>

      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>
            Confirm account deletion
          </DialogTitle>

          <DialogDescription>
            This action cannot be undone.
            <br />
            Please type:
            <span className="font-semibold">
              {" "}
              {CONFIRM_TEXT}
            </span>
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-2">
          <Label htmlFor="confirm-delete">
            Confirmation
          </Label>

          <Input
            id="confirm-delete"
            value={confirmText}
            onChange={(e) =>
              setConfirmText(e.target.value)
            }
            placeholder={CONFIRM_TEXT}
          />
        </div>

        <DialogFooter>
          <DialogClose asChild>
            <Button variant="outline">
              Cancel
            </Button>
          </DialogClose>

          <Button
            variant="destructive"
            disabled={
              !isMatched ||
              deleteAccountMutation.isPending
            }
            onClick={handleDelete}
          >
            {deleteAccountMutation.isPending
              ? "Deleting..."
              : "Delete Account"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}