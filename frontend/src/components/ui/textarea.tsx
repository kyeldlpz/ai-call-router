import { cn } from "@/lib/utils";

function Textarea({
  className,
  ...props
}: React.ComponentProps<"textarea">) {
  return (
    <textarea
      className={cn(
        "textarea-terminal min-h-[88px] resize-y px-3 py-2.5",
        className
      )}
      {...props}
    />
  );
}

export { Textarea };
