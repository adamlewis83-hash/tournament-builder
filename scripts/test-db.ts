import { prisma } from "../src/lib/prisma";
async function main() {
  const row = await prisma.liveTournament.create({ data: { code: "TST99", data: { hello: "world" }, version: 0 } });
  console.log("created:", row.code, row.version);
  const got = await prisma.liveTournament.findUnique({ where: { code: "TST99" } });
  console.log("read back:", JSON.stringify(got?.data));
  await prisma.liveTournament.delete({ where: { code: "TST99" } });
  console.log("cleaned up OK");
}
main().catch((e) => { console.error("DB ERROR:", e?.message || e); process.exit(1); });
