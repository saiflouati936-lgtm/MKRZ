// =====================================
// SUPABASE
// =====================================

const SUPABASE_URL =
    "https://iqhmgefdshmeozcdtrah.supabase.co";

const SUPABASE_KEY =
    "sb_publishable_YS9o0VEh-K5smzRSioA8kQ_AqYH2YLj";

const supabaseClient =
    supabase.createClient(
        SUPABASE_URL,
        SUPABASE_KEY
    );


// =====================================
// عناصر الموقع
// =====================================

const search =
    document.getElementById("searchInput");

const fileInput =
    document.getElementById("fileInput");

const gallery =
    document.getElementById("gallery");

const filters =
    [...document.querySelectorAll(".filter")];


// =====================================
// إنشاء بطاقة
// =====================================

function createCard(fileName, publicUrl) {

    const extension =
        fileName
            .split(".")
            .pop()
            .toLowerCase();

    const videoExtensions = [
        "mp4",
        "webm",
        "mov",
        "mkv",
        "avi"
    ];

    const isVideo =
        videoExtensions.includes(extension);

    const card =
        document.createElement("article");

    card.className = "card";

    card.dataset.type =
        isVideo ? "video" : "image";

    card.dataset.name =
        fileName;


    if (isVideo) {

        card.innerHTML = `
            <div
                class="media"
                style="background:#080b12"
            >
                <video
                    src="${publicUrl}"
                    controls
                    style="
                        width:100%;
                        height:100%;
                        object-fit:cover;
                    "
                ></video>
            </div>

            <div class="card-info">
                <span>🎥 ${fileName}</span>
            </div>
        `;

    } else {

        card.innerHTML = `
            <div
                class="media"
                style="background:#080b12"
            >
                <img
                    src="${publicUrl}"
                    alt="${fileName}"
                    style="
                        width:100%;
                        height:100%;
                        object-fit:cover;
                    "
                >
            </div>

            <div class="card-info">
                <span>💜 ${fileName}</span>
            </div>
        `;

    }

    return card;
}


// =====================================
// تحميل الملفات من Supabase
// =====================================

async function loadFiles() {

    gallery.innerHTML = "";


    const {
        data,
        error
    } =
        await supabaseClient
            .storage
            .from("media")
            .list("", {
                limit: 100,
                sortBy: {
                    column: "created_at",
                    order: "desc"
                }
            });


    if (error) {

        console.error(
            "خطأ في تحميل الملفات:",
            error
        );

        return;
    }


    for (const file of data) {

        // تجاهل المجلدات
        if (!file.id) {
            continue;
        }


        // تجاهل ملف Supabase الخاص بالمجلد الفارغ
        if (
            file.name === ".emptyFolderPlaceholder"
        ) {
            continue;
        }


        const {
            data: publicData
        } =
            supabaseClient
                .storage
                .from("media")
                .getPublicUrl(
                    file.name
                );


        const card =
            createCard(
                file.name,
                publicData.publicUrl
            );


        gallery.appendChild(card);

    }

}


// =====================================
// الفلاتر
// =====================================

filters.forEach(button => {

    button.addEventListener(
        "click",
        () => {

            filters.forEach(btn => {
                btn.classList.remove("active");
            });


            button.classList.add("active");


            const type =
                button.dataset.filter;


            const cards =
                document.querySelectorAll(".card");


            cards.forEach(card => {

                card.style.display =
                    type === "all" ||
                    card.dataset.type === type
                        ? ""
                        : "none";

            });

        }
    );

});


// =====================================
// البحث
// =====================================

search.addEventListener(
    "input",
    () => {

        const query =
            search.value
                .trim()
                .toLowerCase();


        const cards =
            document.querySelectorAll(".card");


        cards.forEach(card => {

            const name =
                card.dataset.name || "";


            card.style.display =
                name
                    .toLowerCase()
                    .includes(query)
                    ? ""
                    : "none";

        });

    }
);


// =====================================
// رفع الملفات
// =====================================

fileInput.addEventListener(
    "change",
    async () => {

        const files =
            [...fileInput.files];


        if (files.length === 0) {
            return;
        }


        for (const file of files) {

            try {

                const extension =
                    file.name.includes(".")
                        ? "." +
                          file.name
                              .split(".")
                              .pop()
                        : "";


                const fileName =
                    Date.now() +
                    "_" +
                    Math.random()
                        .toString(36)
                        .substring(2) +
                    extension;


                const {
                    error
                } =
                    await supabaseClient
                        .storage
                        .from("media")
                        .upload(
                            fileName,
                            file,
                            {
                                cacheControl:
                                    "3600",

                                upsert:
                                    false
                            }
                        );


                if (error) {

                    console.error(error);

                    alert(
                        "فشل رفع الملف:\n\n" +
                        error.message
                    );

                    continue;
                }


                const {
                    data: publicData
                } =
                    supabaseClient
                        .storage
                        .from("media")
                        .getPublicUrl(
                            fileName
                        );


                const card =
                    createCard(
                        fileName,
                        publicData.publicUrl
                    );


                gallery.prepend(card);


            } catch (error) {

                console.error(error);

                alert(
                    "حدث خطأ أثناء رفع الملف."
                );

            }

        }


        fileInput.value = "";

    }
);


// =====================================
// تشغيل الموقع
// =====================================

loadFiles();