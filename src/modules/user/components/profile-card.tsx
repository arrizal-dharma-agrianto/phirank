"use client";

import {
  useEffect,
  useState,
  type ChangeEvent,
  type ComponentProps,
  type ReactNode,
} from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm, useWatch } from "react-hook-form";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ButtonGroup } from "@/components/ui/button-group";
import { initials } from "@/lib/utils";
import {
  ArrowUDownLeftIcon,
  CircleNotchIcon,
  PencilSimpleIcon,
  TrashSimpleIcon,
} from "@phosphor-icons/react";

import { useProfile } from "../hooks/use-profile";
import { useAvatar, useUpdateProfile } from "../hooks";
import { UpdateProfileInput, updateProfileSchema } from "../schemas";
import { ProfileCardSkeleton } from "./profile-card-skeleton";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Label } from "@/components/ui/label";
import { UpdateEmailDialog } from "./update-email-dialog";

type AvatarActionButtonProps = ComponentProps<typeof Button> & {
  tooltip: string;
  suppressTooltip?: boolean;
  children: ReactNode;
};

const AvatarActionButton = ({
  tooltip,
  suppressTooltip = false,
  disabled,
  onClick,
  onPointerLeave,
  children,
  ...props
}: AvatarActionButtonProps) => {
  const [tooltipState, setTooltipState] = useState({
    disabled,
    open: false,
    suppressed: false,
  });
  const isTooltipSuppressed = suppressTooltip || tooltipState.suppressed;
  const tooltipOpen =
    tooltipState.disabled === disabled && !isTooltipSuppressed
      ? tooltipState.open
      : false;

  const button = (
    <Button
      {...props}
      disabled={disabled}
      onClick={(event) => {
        setTooltipState({
          disabled,
          open: false,
          suppressed: true,
        });
        onClick?.(event);
      }}
      onPointerLeave={(event) => {
        setTooltipState({
          disabled,
          open: false,
          suppressed: false,
        });
        onPointerLeave?.(event);
      }}
    >
      {children}
    </Button>
  );

  if (disabled) {
    return button;
  }

  return (
    <Tooltip
      open={tooltipOpen}
      onOpenChange={(open) => {
        setTooltipState({
          disabled,
          open: isTooltipSuppressed ? false : open,
          suppressed: tooltipState.suppressed,
        });
      }}
    >
      <TooltipTrigger asChild>{button}</TooltipTrigger>
      <TooltipContent sideOffset={6}>{tooltip}</TooltipContent>
    </Tooltip>
  );
};

const ProfileCard = () => {
  const { data, isLoading, isError, error } = useProfile();

  const updateProfileMutation = useUpdateProfile();
  const avatar = useAvatar();

  const form = useForm<UpdateProfileInput>({
    resolver: zodResolver(updateProfileSchema),
    defaultValues: {
      name: "",
      image: "",
    },
  });

  useEffect(() => {
    if (data) {
      form.reset({
        name: data.name ?? "",
        image: data.image ?? "",
      });
    }
  }, [data, form]);

  const image = useWatch({
    control: form.control,
    name: "image",
  });
  const imageSrc = avatar.getAvatarSrc(image);
  const isImageLoading =
    avatar.isImageProcessing || avatar.uploadMutation.isPending;
  const isImageDirty = Boolean(form.formState.dirtyFields.image);
  const shouldSuppressAvatarTooltip = isImageLoading || isImageDirty;

  const handleDeleteImage = () => {
    avatar.clearPreview();
    avatar.clearUploadError();

    form.setValue("image", "", {
      shouldDirty: true,
      shouldValidate: true,
    });
  };

  const handleUndoImage = () => {
    const savedImage = data?.image ?? "";

    avatar.clearPreview();
    avatar.clearUploadError();

    form.resetField("image", {
      defaultValue: savedImage,
    });
    form.setValue("image", savedImage, {
      shouldDirty: true,
      shouldValidate: true,
    });
  };

  const handleImageChange = async (e: ChangeEvent<HTMLInputElement>) => {
    const key = await avatar.uploadAvatarToTemp(e);

    if (!key) return;

    form.setValue("image", key, {
      shouldDirty: true,
      shouldValidate: true,
    });
  };

  const onSubmit = async (values: UpdateProfileInput) => {
    const updatedProfile = await updateProfileMutation.mutateAsync(values);

    avatar.clearPreview();
    avatar.clearUploadError();

    form.reset({
      name: updatedProfile.name ?? "",
      image: updatedProfile.image ?? "",
    });
  };

  if (isLoading) {
    return <ProfileCardSkeleton />;
  }

  if (isError) {
    return <p>{error.message}</p>;
  }

  if (!data) {
    return <p>Something went wrong</p>;
  }

  return (
    <Card className="w-full max-w-sm">
      <form onSubmit={form.handleSubmit(onSubmit)}>
        <CardHeader>
          <CardTitle>Profile</CardTitle>
        </CardHeader>

        <CardContent className="space-y-4">
          <div className="flex flex-col gap-6">
            <div className="flex flex-col gap-2 items-center">
              <div className="relative">
                <Avatar className="h-24 w-24">
                  <AvatarImage key={imageSrc} src={imageSrc} />
                  <AvatarFallback>
                    <span className="text-lg">
                      {initials(data.name ?? "User")}
                    </span>
                  </AvatarFallback>
                </Avatar>
                {isImageLoading && (
                  <div className="absolute inset-0 flex items-center justify-center rounded-full bg-background/70">
                    <CircleNotchIcon
                      className="size-6 animate-spin text-foreground"
                      aria-hidden="true"
                    />
                    <span className="sr-only">Loading image</span>
                  </div>
                )}
              </div>

              <input
                key={avatar.fileInputKey}
                id={avatar.fileInputId}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleImageChange}
              />

              <div className="flex gap-2">
                <AvatarActionButton
                  tooltip="Edit image"
                  variant="outline"
                  size="icon"
                  type="button"
                  onClick={avatar.openFilePicker}
                  suppressTooltip={shouldSuppressAvatarTooltip}
                  disabled={isImageLoading || updateProfileMutation.isPending}
                  aria-label="Edit image"
                >
                  <PencilSimpleIcon size={18} />
                </AvatarActionButton>
                {(image || avatar.previewUrl) && (
                  <AvatarActionButton
                    tooltip="Delete image"
                    variant="destructive"
                    size="icon"
                    type="button"
                    onClick={handleDeleteImage}
                    suppressTooltip={shouldSuppressAvatarTooltip}
                    disabled={isImageLoading || updateProfileMutation.isPending}
                    aria-label="Delete image"
                  >
                    <TrashSimpleIcon size={18} />
                  </AvatarActionButton>
                )}
                {isImageDirty && (
                  <AvatarActionButton
                    tooltip="Undo image change"
                    variant="outline"
                    size="icon"
                    type="button"
                    onClick={handleUndoImage}
                    suppressTooltip={shouldSuppressAvatarTooltip}
                    disabled={isImageLoading || updateProfileMutation.isPending}
                    aria-label="Undo image change"
                  >
                    <ArrowUDownLeftIcon size={18} />
                  </AvatarActionButton>
                )}
              </div>
            </div>

            <div className="grid gap-2">
              <label htmlFor="name" className="text-sm font-medium">
                Name
              </label>

              <Input id="name" placeholder="Name" {...form.register("name")} />

              {form.formState.errors.name && (
                <p className="text-sm text-red-500">
                  {form.formState.errors.name.message}
                </p>
              )}
            </div>

            <div className="grid gap-2">
              <Label htmlFor="email" className="text-sm font-medium">
                Email
              </Label>
              <ButtonGroup className="w-full">
                <Input id="email" value={data.email ?? ""} disabled />
                {!data.isOAuthOnly && (
                  <UpdateEmailDialog currentEmail={data.email ?? ""} />
                )}
              </ButtonGroup>
            </div>

            {(avatar.imageUploadError || avatar.uploadMutation.isError) && (
              <p className="text-sm text-red-500">
                {avatar.imageUploadError ??
                  avatar.uploadMutation.error?.message ??
                  "Something went wrong"}
              </p>
            )}

            {updateProfileMutation.isError && (
              <p className="text-sm text-red-500">
                {updateProfileMutation.error.message}
              </p>
            )}
          </div>
        </CardContent>

        <CardFooter className="mt-4 flex-col gap-2">
          <Button
            className="w-full"
            type="submit"
            disabled={
              isImageLoading ||
              updateProfileMutation.isPending ||
              !form.formState.isDirty
            }
          >
            {updateProfileMutation.isPending ? "Saving..." : "Save changes"}
          </Button>
        </CardFooter>
      </form>
    </Card>
  );
};

export { ProfileCard };
