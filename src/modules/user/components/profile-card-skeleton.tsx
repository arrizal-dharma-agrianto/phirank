import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";

const SkeletonBlock = ({ className }: { className: string }) => (
  <div className={`animate-pulse bg-muted ${className}`} />
);

const ProfileCardSkeleton = () => {
  return (
    <Card className="w-full max-w-sm">
      <CardHeader>
        <SkeletonBlock className="h-5 w-20" />
      </CardHeader>

      <CardContent className="space-y-4">
        <div className="flex flex-col gap-6">
          <div className="flex flex-col items-center gap-2">
            <SkeletonBlock className="h-24 w-24 rounded-full" />
            <div className="flex gap-2">
              <SkeletonBlock className="h-8 w-8" />
              <SkeletonBlock className="h-8 w-8" />
            </div>
          </div>

          <div className="grid gap-2">
            <SkeletonBlock className="h-4 w-12" />
            <SkeletonBlock className="h-8 w-full" />
          </div>

          <div className="grid gap-2">
            <SkeletonBlock className="h-4 w-12" />
            <SkeletonBlock className="h-8 w-full" />
          </div>
        </div>
      </CardContent>

      <CardFooter className="mt-4 flex-col gap-2">
        <SkeletonBlock className="h-8 w-full" />
      </CardFooter>
    </Card>
  );
};

export { ProfileCardSkeleton };
