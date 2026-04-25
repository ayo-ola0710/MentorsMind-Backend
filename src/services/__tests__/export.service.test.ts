import { ExportService } from "../export.service";

describe("ExportService", () => {
  describe("jsonToCsv", () => {
    it("should handle fields with newlines correctly", () => {
      const items = [
        {
          id: "1",
          name: "Test User",
          bio: "Line 1\nLine 2\nLine 3",
          notes: "Note with\nnewline",
        },
      ];

      const csv = ExportService.jsonToCsv(items);
      // Should contain escaped newlines as \n within quoted fields
      expect(csv).toContain('"Line 1\\nLine 2\\nLine 3"');
      expect(csv).toContain('"Note with\\nnewline"');
      // Should have exactly 2 lines (header + 1 data row)
      const lines = csv.split("\r\n");
      expect(lines.length).toBe(2);
    });

    it("should handle fields with commas and double quotes correctly", () => {
      const items = [
        {
          id: "1",
          name: 'User "Tester"',
          bio: "Bio, with, commas",
          notes: 'Note "with" quotes',
        },
      ];

      const csv = ExportService.jsonToCsv(items);
      // Should properly escape quotes and commas
      expect(csv).toContain('"""User ""Tester"""""'); // Escaped quotes
      expect(csv).toContain('"""Bio, with, commas"""'); // Commas inside quotes
      expect(csv).toContain('"""Note ""with"" quotes"""'); // Escaped quotes
    });

    it("should handle fields with newlines, commas, and double quotes combined", () => {
      const items = [
        {
          id: "1",
          complexField: 'Line 1\nLine 2,"quoted, value",Line 3',
        },
      ];

      const csv = ExportService.jsonToCsv(items);
      // Should handle all special characters correctly
      expect(csv).toContain('"Line 1\\nLine 2,\"quoted, value\",Line 3"');
      // Should have exactly 2 lines (header + 1 data row)
      const lines = csv.split("\r\n");
      expect(lines.length).toBe(2);
    });

    it("should return empty string for empty array", () => {
      const csv = ExportService.jsonToCsv([]);
      expect(csv).toBe("");
    });

    it("should handle null values correctly", () => {
      const items = [
        {
          id: "1",
          name: "Test",
          nullableField: null,
        },
      ];

      const csv = ExportService.jsonToCsv(items);
      expect(csv).toContain(",,"); // Empty value for null
    });
  });
});
