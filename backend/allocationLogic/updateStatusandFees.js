import { PrismaClient } from "./prisma/generated/prisma/index.js";

const prisma = new PrismaClient();

const updates = [
  { id: "20250000441", status: "FREEZE", feesPaid: true },
  { id: "20250000418", status: "FREEZE", feesPaid: true },
  { id: "20250000234", status: "FREEZE", feesPaid: true },
  { id: "20250000746", status: "FREEZE", feesPaid: true },
  { id: "20250001089", status: "FREEZE", feesPaid: true },
  { id: "20250000603", status: "FREEZE", feesPaid: true },
  { id: "20250000292", status: "FREEZE", feesPaid: true },
  { id: "20250000908", status: "FREEZE", feesPaid: true },
  { id: "20250000675", status: "FREEZE", feesPaid: true },
  { id: "20250001058", status: "FREEZE", feesPaid: true },
  { id: "20250000672", status: "FREEZE", feesPaid: true },
  { id: "20250000318", status: "FREEZE", feesPaid: true },
  { id: "20250001024", status: "FREEZE", feesPaid: true },
  { id: "20250000545", status: "FREEZE", feesPaid: true },
  { id: "20250000463", status: "FREEZE", feesPaid: true },
  { id: "20250000357", status: "FREEZE", feesPaid: true },
  { id: "20250001126", status: "FREEZE", feesPaid: true },
  { id: "20250000350", status: "FREEZE", feesPaid: true },
  { id: "20250001191", status: "FREEZE", feesPaid: true },
  { id: "20250000217", status: "FREEZE", feesPaid: true },
  { id: "20250000645", status: "FREEZE", feesPaid: true },
  { id: "20250000326", status: "FREEZE", feesPaid: true },
  { id: "20250000286", status: "FREEZE", feesPaid: true },
  { id: "20250000557", status: "FREEZE", feesPaid: true },
  { id: "20250000980", status: "FREEZE", feesPaid: true },
  { id: "20250000301", status: "FREEZE", feesPaid: true },
  { id: "20250000226", status: "FREEZE", feesPaid: true },

  { id: "20250000608", status: "FLOAT", feesPaid: true },
  { id: "20250000560", status: "FLOAT", feesPaid: true },
  { id: "20250000368", status: "FLOAT", feesPaid: true },
  { id: "20250000846", status: "FLOAT", feesPaid: true },
  { id: "20250000280", status: "FLOAT", feesPaid: true },
  { id: "20250000571", status: "FLOAT", feesPaid: true },
  { id: "20250000809", status: "FLOAT", feesPaid: true },
  { id: "20250000287", status: "FLOAT", feesPaid: true },

  { id: "20250000567", status: "NO", feesPaid: false },
  { id: "20250000853", status: "NO", feesPaid: false },
  { id: "20250000331", status: "NO", feesPaid: false },
  { id: "20250000943", status: "NO", feesPaid: false },
  { id: "20250000210", status: "NO", feesPaid: false },
  { id: "20250000599", status: "NO", feesPaid: false },
  { id: "20250001183", status: "NO", feesPaid: false },
  { id: "20250000265", status: "NO", feesPaid: false },
  { id: "20250000961", status: "NO", feesPaid: false },
  { id: "20250000843", status: "NO", feesPaid: false },
  { id: "20250000098", status: "NO", feesPaid: false },
  { id: "20250000123", status: "NO", feesPaid: false },
  { id: "20250000778", status: "NO", feesPaid: false },
  { id: "20250000324", status: "NO", feesPaid: false },
  { id: "20250000729", status: "NO", feesPaid: false },
  { id: "20250000329", status: "NO", feesPaid: false },
  { id: "20250000494", status: "NO", feesPaid: false },
  { id: "20250000755", status: "NO", feesPaid: false },
  { id: "20250000699", status: "NO", feesPaid: false },
  { id: "20250001125", status: "NO", feesPaid: false },
  { id: "20250000750", status: "NO", feesPaid: false },
  { id: "20250000312", status: "NO", feesPaid: false },
  { id: "20250000457", status: "NO", feesPaid: false },
  { id: "20250000187", status: "NO", feesPaid: false },
  { id: "20250000372", status: "NO", feesPaid: false },
  { id: "20250000258", status: "NO", feesPaid: false },
  { id: "20250000248", status: "NO", feesPaid: false },
  { id: "20250000743", status: "NO", feesPaid: false },
  { id: "20250001201", status: "NO", feesPaid: false },
  { id: "20250000112", status: "NO", feesPaid: false },
  { id: "20250000713", status: "NO", feesPaid: false },
  { id: "20250000656", status: "NO", feesPaid: false },
  { id: "20250000684", status: "NO", feesPaid: false },
  { id: "20250000400", status: "NO", feesPaid: false },
  { id: "20250000674", status: "NO", feesPaid: false },
  { id: "20250000671", status: "NO", feesPaid: false },
  { id: "20250000688", status: "NO", feesPaid: false },
  { id: "20250000276", status: "NO", feesPaid: false },
  { id: "20250000614", status: "NO", feesPaid: false },
  { id: "20250000825", status: "NO", feesPaid: false },
  { id: "20250000857", status: "NO", feesPaid: false },
  { id: "20250000876", status: "NO", feesPaid: false },
  { id: "20250000220", status: "NO", feesPaid: false },
  { id: "20250000367", status: "NO", feesPaid: false },
  { id: "20250000336", status: "NO", feesPaid: false },
  { id: "20250001142", status: "NO", feesPaid: false },
  { id: "20250000880", status: "NO", feesPaid: false },
  { id: "20250000216", status: "NO", feesPaid: false },
  { id: "20250000309", status: "NO", feesPaid: false },
  { id: "20250000185", status: "NO", feesPaid: false },
  { id: "20250000623", status: "NO", feesPaid: false },
  { id: "20250001012", status: "NO", feesPaid: false },
  { id: "20250000378", status: "NO", feesPaid: false },
  { id: "20250000804", status: "NO", feesPaid: false },
  { id: "20250000920", status: "NO", feesPaid: false },
  { id: "20250000789", status: "NO", feesPaid: false },
  { id: "20250000945", status: "NO", feesPaid: false },
  { id: "20250001192", status: "NO", feesPaid: false },
  { id: "20250000709", status: "NO", feesPaid: false },
  { id: "20250000758", status: "NO", feesPaid: false },
  { id: "20250000563", status: "NO", feesPaid: false },
  { id: "20250000627", status: "NO", feesPaid: false },
  { id: "20250000765", status: "NO", feesPaid: false },
  { id: "20250000708", status: "NO", feesPaid: false },
  { id: "20250000982", status: "NO", feesPaid: false },
  { id: "20250001200", status: "NO", feesPaid: false },
  { id: "20250001023", status: "NO", feesPaid: false },
  { id: "20250000856", status: "NO", feesPaid: false },
  { id: "20250000550", status: "NO", feesPaid: false },
  { id: "20250000882", status: "NO", feesPaid: false },
  { id: "20250000807", status: "NO", feesPaid: false },
  { id: "20250000417", status: "NO", feesPaid: false },
  { id: "20250001068", status: "NO", feesPaid: false },
  { id: "20250000253", status: "NO", feesPaid: false },
  { id: "20250000762", status: "NO", feesPaid: false },
  { id: "20250000619", status: "NO", feesPaid: false },
  { id: "20250000071", status: "NO", feesPaid: false },
  { id: "20250001123", status: "NO", feesPaid: false },
  { id: "20250000168", status: "NO", feesPaid: false },
  { id: "20250000715", status: "NO", feesPaid: false },
  { id: "20250000691", status: "NO", feesPaid: false },
  { id: "20250000592", status: "NO", feesPaid: false },
  { id: "20250001194", status: "NO", feesPaid: false },
  { id: "20250000683", status: "NO", feesPaid: false },
  { id: "20250000701", status: "NO", feesPaid: false },
  { id: "20250001149", status: "NO", feesPaid: false },
  { id: "20250000447", status: "NO", feesPaid: false },

  // Add more students here...
];

async function updateStudentStatus() {
  try {
    for (const { id, status, feesPaid } of updates) {
      const updated = await prisma.StudentApplication.update({
        where: { applicationNumber: id },
        data: {
          status,
          feesPaid,
        },
      });

      console.log(
        `✅ Updated ${id} → Status: ${updated.status}, FeesPaid: ${updated.feesPaid}`
      );
    }

    console.log("\n🎉 All updates completed successfully.");
  } catch (error) {
    console.error("❌ Error updating student statuses:", error);
  } finally {
    await prisma.$disconnect();
  }
}

updateStudentStatus();
