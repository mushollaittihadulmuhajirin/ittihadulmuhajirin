require("dotenv").config();

const supabase = require("./config/supabase");

(async () => {
    const { data, error } = await supabase
        .storage
        .from(process.env.SUPABASE_BUCKET)
        .list();

    if (error) {
        console.error(error);
    } else {
        console.log("✅ Berhasil konek ke bucket");
        console.log(data);
    }
})();