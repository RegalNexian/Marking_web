const ExcelJS = require('exceljs');
const Marks = require('../models/Marks');
const Team = require('../models/Team');
const Jury = require('../models/Jury');
const Config = require('../models/Config');
const {
  ensureTrackDocument,
  normalizeTeams,
  normalizeJuries,
  normalizeMarks
} = require('../utils/trackNormalization');

const ensureTrack = async (trackId) => {
  if (!trackId) {
    const err = new Error('trackId is required');
    err.statusCode = 400;
    throw err;
  }
  const track = await ensureTrackDocument(trackId);
  if (!track) {
    const err = new Error('Track not found');
    err.statusCode = 404;
    throw err;
  }
  return track;
};

// Export jury-wise Excel file
const exportJuryExcel = async (req, res) => {
  try {
    const { juryName } = req.params;
    const { trackId } = req.query;

    // Skip normalization - too slow for exports
    const track = await ensureTrack(trackId);

    const [marks, teams, jury] = await Promise.all([
      Marks.find({ juryName, track: track._id }),
      Team.find({ track: track._id }),
      Jury.findOne({ name: juryName })
    ]);

    if (!jury) {
      return res.status(404).json({ message: 'Jury not found' });
    }

    const isAssigned = jury.assignments.some(
      (assignment) => assignment.track.toString() === track._id.toString()
    );

    if (!isAssigned) {
      return res.status(403).json({ message: 'Jury is not assigned to this track' });
    }

    const config = await Config.findOne({}) || new Config();

    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet(`${juryName}_${track.slug || trackId}`);

    // Use dynamic criteria
    const criteriaList = config.criteria || [];
    console.log("Using criteria list:", criteriaList);
    
    const headers = ['S.No', 'Team Name', ...criteriaList, 'Total'];
    worksheet.addRow(headers);

    // Style headers
    const headerRow = worksheet.getRow(1);
    headerRow.font = { bold: true, color: { argb: 'FFFFFF' } };
    headerRow.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: '366092' }
    };

    // Add data rows
    let serialNo = 1;
    for (const team of teams) {
      const teamMarks = marks.find(m => m.teamName === team.name);
      if (teamMarks) {
        // ✅ Use .get() for Map fields
        const criteriaValues = criteriaList.map(criterion => teamMarks.criteria.get(criterion) ?? 0);
        const rowData = [
          serialNo++,
          team.name,
          ...criteriaValues,
          teamMarks.total
        ];
        worksheet.addRow(rowData);
      } else {
        const rowData = [
          serialNo++,
          team.name,
          ...criteriaList.map(() => 0),
          0
        ];
        worksheet.addRow(rowData);
      }
    }

    // Auto-fit columns
    worksheet.columns.forEach(column => {
      column.width = Math.max(column.width || 10, 15);
    });

    // Add borders to all cells
    worksheet.eachRow((row) => {
      row.eachCell((cell) => {
        cell.border = {
          top: { style: 'thin' },
          left: { style: 'thin' },
          bottom: { style: 'thin' },
          right: { style: 'thin' }
        };
      });
    });

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename=${juryName}_${track.slug || trackId}_Marks.xlsx`);

    await workbook.xlsx.write(res);
    res.end();
  } catch (error) {
    console.error('Error in exportJuryExcel:', error);
    res.status(error.statusCode || 500).json({ message: error.message });
  }
};

// Export leaderboard Excel file
const exportLeaderboardExcel = async (req, res) => {
  try {
    const { trackId } = req.query;
    
    // Skip normalization - too slow for exports
    const track = await ensureTrack(trackId);

    const [teams, juries, allMarks] = await Promise.all([
      Team.find({ track: track._id }),
      Jury.find({ 'assignments.track': track._id }),
      Marks.find({ track: track._id })
    ]);

    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet(`Leaderboard_${track.slug || trackId}`);

    // Create leaderboard data
    const leaderboard = teams.map(team => {
      const teamData = {
        teamName: team.name,
        juryTotals: {},
        grandTotal: 0
      };

      let totalScore = 0;
      juries.forEach(jury => {
        const juryMarks = allMarks.find(
          mark => mark.juryName === jury.name && mark.teamName === team.name
        );
        const score = juryMarks ? juryMarks.total : 0;
        teamData.juryTotals[jury.name] = score;
        totalScore += score;
      });

      teamData.grandTotal = totalScore;
      return teamData;
    });

    // Sort by grand total (descending)
    leaderboard.sort((a, b) => b.grandTotal - a.grandTotal);

    // Add headers
    const juryHeaders = juries.map(j => `${j.name} Total`);
    const headers = ['Rank', 'Team Name', ...juryHeaders, 'Grand Total'];
    worksheet.addRow(headers);

    // Style headers
    const headerRow = worksheet.getRow(1);
    headerRow.font = { bold: true, color: { argb: 'FFFFFF' } };
    headerRow.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: '366092' }
    };

    // Add data rows
    leaderboard.forEach((team, index) => {
      const rank = index + 1;
      const juryScores = juries.map(j => team.juryTotals[j.name] || 0);
      const rowData = [rank, team.teamName, ...juryScores, team.grandTotal];
      const row = worksheet.addRow(rowData);

      // Highlight top 3 ranks
      if (rank <= 3) {
        let fillColor = '';
        switch (rank) {
          case 1: fillColor = 'FFD700'; break; // Gold
          case 2: fillColor = 'C0C0C0'; break; // Silver
          case 3: fillColor = 'CD7F32'; break; // Bronze
        }
        row.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: fillColor }
        };
      }
    });

    // Auto-fit columns
    worksheet.columns.forEach(column => {
      column.width = Math.max(column.width || 10, 15);
    });

    // Add borders
    worksheet.eachRow((row) => {
      row.eachCell((cell) => {
        cell.border = {
          top: { style: 'thin' },
          left: { style: 'thin' },
          bottom: { style: 'thin' },
          right: { style: 'thin' }
        };
      });
    });

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename=Leaderboard_${track.slug || trackId}.xlsx`);

    await workbook.xlsx.write(res);
    res.end();
  } catch (error) {
    console.error('Error in exportLeaderboardExcel:', error);
    res.status(error.statusCode || 500).json({ message: error.message });
  }
};

module.exports = {
  exportJuryExcel,
  exportLeaderboardExcel
};
