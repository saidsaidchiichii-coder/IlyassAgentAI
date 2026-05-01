console.log("FUNCTION STARTED");

module.exports = async (req, res) => {
  try {
    console.log("REQUEST METHOD:", req.method);

    return res.status(200).json({
      ok: true,
      message: "API is working",
    });

  } catch (err) {
    console.error("CRASH:", err);

    return res.status(500).json({
      error: err.message,
    });
  }
};
