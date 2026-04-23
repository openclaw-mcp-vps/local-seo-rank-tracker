import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { CompetitorResult } from "@/lib/types";

type CompetitorTableProps = {
  competitors: CompetitorResult[];
  trackedBusiness: string;
};

export function CompetitorTable({ competitors, trackedBusiness }: CompetitorTableProps) {
  if (competitors.length === 0) {
    return (
      <div className="rounded-lg border border-slate-800 bg-slate-900/70 p-4 text-sm text-slate-400">
        Run a ranking check to load competitors for this keyword and location.
      </div>
    );
  }

  const tracked = trackedBusiness.trim().toLowerCase();

  return (
    <div className="overflow-hidden rounded-lg border border-slate-800 bg-slate-900/70">
      <Table>
        <TableHeader>
          <TableRow className="hover:bg-slate-900/80">
            <TableHead className="w-12 text-slate-300">Rank</TableHead>
            <TableHead className="text-slate-300">Business</TableHead>
            <TableHead className="text-slate-300">Rating</TableHead>
            <TableHead className="text-slate-300">Reviews</TableHead>
            <TableHead className="text-slate-300">Address</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {competitors.map((competitor) => {
            const isTracked = tracked
              ? competitor.name.toLowerCase().includes(tracked)
              : false;

            return (
              <TableRow key={`${competitor.rank}-${competitor.name}`} className="hover:bg-slate-900/80">
                <TableCell className="font-medium text-slate-100">#{competitor.rank}</TableCell>
                <TableCell className="text-slate-200">
                  <div className="flex items-center gap-2">
                    <span>{competitor.name}</span>
                    {isTracked ? (
                      <Badge className="border border-cyan-400/40 bg-cyan-400/10 text-cyan-200">
                        You
                      </Badge>
                    ) : null}
                  </div>
                </TableCell>
                <TableCell className="text-slate-300">
                  {competitor.rating ? competitor.rating.toFixed(1) : "-"}
                </TableCell>
                <TableCell className="text-slate-300">
                  {competitor.reviewCount ? competitor.reviewCount.toLocaleString() : "-"}
                </TableCell>
                <TableCell className="text-slate-400">{competitor.address}</TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}
