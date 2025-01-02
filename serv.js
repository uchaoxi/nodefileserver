#!/usr/bin/env node
import path from 'node:path';
import fs from 'node:fs';
import os from 'node:os';
import express from 'express';
import multer from 'multer';
import dayjs from 'dayjs';
import prettyBytes from 'pretty-bytes';
import minimist from 'minimist';
import { detect } from 'detect-port';


const app = express();
const fsPromise = fs.promises;

// 获取端口
const args = minimist(process.argv.slice(2), {
    boolean: ['help'],
    alias: { h: 'help' }
});
if (args.help) {
    console.log(`
Usage: nodefileserver [options]

Options:
    -h, --help      Show this help message and exit.
    -p, --port <n>  The port to listen on (default: 8001).
    `);
    process.exit(0);
}

const port = args.port || 8001;

// 检测端口可用性
await detect(port)
    .then(realPort => {
        if (port !== realPort) {
            console.log(`port: ${port} was occupied, you can try port: ${realPort}`);
            process.exit(0);
        }
    })
    .catch(err => {
        console.log(err);
        process.exit(0);
    });


// public静态资源
app.use(express.static('public'));

// 设置pug为模板引擎
app.set('view engine', 'pug');
app.set('views', './views');

const basePath = process.cwd();

// 配置Multer的存储选项
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        const dir = path.join(basePath, req.body.customPath);
        cb(null, dir);
    },
    filename: function (req, file, cb) {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        const originName = decodeURIComponent(file.originalname)
        const extName = path.extname(originName);
        const baseName = path.basename(originName, extName);
        cb(null, baseName + '-' + uniqueSuffix + extName)
    }
});
const upload = multer({ storage: storage });

// 处理目录访问、文件下载
app.get('(.*)', async (req, res) => {
    const reqPath = decodeURIComponent(req.path);
    const requestPath = path.join(basePath, reqPath);

    if (fs.statSync(requestPath).isDirectory()) {
        const items = await fsPromise.readdir(requestPath);
        const files = await getStats(items, requestPath);
        const fileInfo = files.map((file, index) => ({ ...file, link: path.join(reqPath, items[index]) }));
        fileInfo.unshift({
            name: 'homepage',
            type: 'home',
            link: '/',
            size: '',
            updateTime: ''
        })
        res.render('index', { fileInfo });
    } else {
        res.download(requestPath);
    }
});

// 处理文件上传
app.post('/upload', upload.single('inputFile'), (req, res) => {
    res.send({ status: 0, message: 'File uploaded successfully.' });
});

// 获取当前路径下文件状态
async function getStats(files, requestPath) {
    const statsPromises = files.map(file => {
        const filePath = path.join(requestPath, file);
        return fsPromise.stat(filePath).catch(e => {
            console.log(e)
        })
    });

    return Promise.all(statsPromises)
        .then(stats => {
            const result = stats.map((stat, index) => ({
                name: files[index],
                size: prettyBytes(stat.size),
                updateTime: dayjs(stat.mtimeMs).format('YYYY_MM_DD HH:mm:ss'),
                type: stat.isDirectory() ? 'dir' : 'file'
            }));
            return result;
        })
        .catch(e => {
            console.log('getStat Error', e);
        });
}

// 获取本机ip
function getLocalIP() {
    const interfaces = os.networkInterfaces();
    for (const iface of Object.keys(interfaces)) {
        for (const alias of interfaces[iface]) {
            if (alias.family === 'IPv4' && !alias.internal) {
                return alias.address;
            }
        }
    }
    return '0.0.0.0';
}

// 启动server
app.listen(port, () => {
    console.log(`file server is ready, serving ${getLocalIP()}:${port}`);
});
