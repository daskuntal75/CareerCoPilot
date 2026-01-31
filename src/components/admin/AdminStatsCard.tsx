import { ReactNode } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface AdminStatsCardProps {
  icon: ReactNode;
  iconBgColor: string;
  value: number | string;
  label: string;
  onClick?: () => void;
  isClickable?: boolean;
}

const AdminStatsCard = ({
  icon,
  iconBgColor,
  value,
  label,
  onClick,
  isClickable = false,
}: AdminStatsCardProps) => {
  return (
    <Card
      className={cn(
        "transition-all duration-200",
        isClickable && "cursor-pointer hover:shadow-lg hover:border-accent/50 hover:scale-[1.02]"
      )}
      onClick={isClickable ? onClick : undefined}
    >
      <CardContent className="p-6">
        <div className="flex items-center gap-4">
          <div className={cn("p-3 rounded-xl", iconBgColor)}>
            {icon}
          </div>
          <div>
            <div className="text-2xl font-bold text-foreground">
              {value}
            </div>
            <div className="text-sm text-muted-foreground">{label}</div>
          </div>
        </div>
        {isClickable && (
          <div className="mt-2 text-xs text-accent">Click to view details →</div>
        )}
      </CardContent>
    </Card>
  );
};

export default AdminStatsCard;
