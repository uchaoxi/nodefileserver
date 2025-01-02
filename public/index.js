const inputFile = document.querySelector('.inputFile');
const btnSubmit = document.querySelector('.btnSubmit');
const btnCancel = document.querySelector('.btnCancel');
const info = document.querySelector('.info');

btnSubmit.addEventListener('click', e => {
    const file = inputFile.files[0];
    if (!file) {
        return;
    }
    const formData = new FormData();

    // 注意这里customPath必须在inputFile之前append，不然multer获取不到customPath
    formData.append('customPath', location.pathname);
    formData.append('inputFile', file, encodeURIComponent(file.name));
    
    fetch('./upload', {
        method: 'post',
        body: formData
    })
    .then(res => res.json())
    .then(data => {
        info.innerText = data.message;
        console.log(data)
    })
    .catch(error => {
        console.error(error)
    });
});

btnCancel.addEventListener('click', e => {
    inputFile.value = '';
});