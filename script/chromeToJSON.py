import json
import os
import tkinter as tk
from tkinter import filedialog, ttk, messagebox, scrolledtext
from bs4 import BeautifulSoup
from datetime import datetime

class BookmarkConverterApp:
    def __init__(self, root):
        self.root = root
        self.root.title("书签转换工具")
        self.root.geometry("900x700")  # 设置窗口大小
        
        # 设置变量
        self.bookmark_file_path = tk.StringVar()
        self.json_file_path = tk.StringVar()
        self.output_file_path = tk.StringVar(value="result.json")  # 默认输出文件名
        self.site_title = tk.StringVar(value="导航站")
        self.site_name = tk.StringVar(value="导航站")
        
        # 创建界面
        self.create_widgets()
    
    def create_widgets(self):
        # 创建选项卡控件
        notebook = ttk.Notebook(self.root)
        notebook.pack(fill=tk.BOTH, expand=True, padx=10, pady=10)
        
        # 主操作选项卡
        main_frame = ttk.Frame(notebook, padding=10)
        notebook.add(main_frame, text="主操作")
        
        # 配置选项卡
        config_frame = ttk.Frame(notebook, padding=10)
        notebook.add(config_frame, text="配置设置")
        
        # 预览选项卡
        preview_frame = ttk.Frame(notebook, padding=10)
        notebook.add(preview_frame, text="JSON预览")
        
        # 帮助选项卡
        help_frame = ttk.Frame(notebook, padding=10)
        notebook.add(help_frame, text="使用帮助")
        
        # ===== 主操作选项卡内容 =====
        # 创建输入区域
        input_frame = ttk.LabelFrame(main_frame, text="输入文件", padding=10)
        input_frame.pack(fill=tk.X, padx=5, pady=5)
        
        # 书签文件选择
        ttk.Label(input_frame, text="书签HTML文件:").grid(row=0, column=0, sticky=tk.W, padx=5, pady=5)
        ttk.Entry(input_frame, textvariable=self.bookmark_file_path, width=50).grid(row=0, column=1, padx=5, pady=5)
        ttk.Button(input_frame, text="浏览...", command=self.browse_bookmark_file).grid(row=0, column=2, padx=5, pady=5)
        
        # JSON文件选择(可选)
        ttk.Label(input_frame, text="现有JSON文件(可选):").grid(row=1, column=0, sticky=tk.W, padx=5, pady=5)
        ttk.Entry(input_frame, textvariable=self.json_file_path, width=50).grid(row=1, column=1, padx=5, pady=5)
        ttk.Button(input_frame, text="浏览...", command=self.browse_json_file).grid(row=1, column=2, padx=5, pady=5)
        
        # 输出文件设置
        output_frame = ttk.LabelFrame(main_frame, text="输出设置", padding=10)
        output_frame.pack(fill=tk.X, padx=5, pady=5)
        
        ttk.Label(output_frame, text="输出JSON文件:").grid(row=0, column=0, sticky=tk.W, padx=5, pady=5)
        ttk.Entry(output_frame, textvariable=self.output_file_path, width=50).grid(row=0, column=1, padx=5, pady=5)
        ttk.Button(output_frame, text="浏览...", command=self.browse_output_file).grid(row=0, column=2, padx=5, pady=5)
        
        # 按钮区
        button_frame = ttk.Frame(main_frame)
        button_frame.pack(fill=tk.X, padx=5, pady=10)
        
        ttk.Button(button_frame, text="预览结果", command=self.preview_json, width=15).pack(side=tk.RIGHT, padx=5)
        ttk.Button(button_frame, text="开始转换", command=self.start_conversion, width=15).pack(side=tk.RIGHT, padx=5)
        
        # 日志区域
        log_frame = ttk.LabelFrame(main_frame, text="处理日志", padding=10)
        log_frame.pack(fill=tk.BOTH, expand=True, padx=5, pady=5)
        
        self.log_text = scrolledtext.ScrolledText(log_frame, wrap=tk.WORD, width=80, height=15)
        self.log_text.pack(fill=tk.BOTH, expand=True)
        
        # 进度条
        self.progress_var = tk.DoubleVar()
        self.progress_bar = ttk.Progressbar(main_frame, variable=self.progress_var, maximum=100)
        self.progress_bar.pack(fill=tk.X, padx=5, pady=5)
        
        # 状态栏
        self.status_var = tk.StringVar(value="就绪")
        status_bar = ttk.Label(main_frame, textvariable=self.status_var, relief=tk.SUNKEN, anchor=tk.W)
        status_bar.pack(fill=tk.X, padx=5, pady=5)
        
        # ===== 配置选项卡内容 =====
        config_inner_frame = ttk.Frame(config_frame, padding=10)
        config_inner_frame.pack(fill=tk.BOTH, expand=True)
        
        ttk.Label(config_inner_frame, text="网站标题:").grid(row=0, column=0, sticky=tk.W, padx=5, pady=10)
        ttk.Entry(config_inner_frame, textvariable=self.site_title, width=50).grid(row=0, column=1, padx=5, pady=10, sticky=tk.W)
        
        ttk.Label(config_inner_frame, text="网站名称:").grid(row=1, column=0, sticky=tk.W, padx=5, pady=10)
        ttk.Entry(config_inner_frame, textvariable=self.site_name, width=50).grid(row=1, column=1, padx=5, pady=10, sticky=tk.W)
        
        ttk.Label(config_inner_frame, text="自定义CSS:").grid(row=2, column=0, sticky=tk.NW, padx=5, pady=10)
        self.custom_css_text = scrolledtext.ScrolledText(config_inner_frame, wrap=tk.WORD, width=60, height=20)
        self.custom_css_text.grid(row=2, column=1, padx=5, pady=10, sticky=tk.W)
        
        # ===== 预览选项卡内容 =====
        self.preview_text = scrolledtext.ScrolledText(preview_frame, wrap=tk.WORD, width=80, height=30)
        self.preview_text.pack(fill=tk.BOTH, expand=True, padx=5, pady=5)
        
        # ===== 帮助选项卡内容 =====
        help_text = scrolledtext.ScrolledText(help_frame, wrap=tk.WORD, width=80, height=25)
        help_text.pack(fill=tk.BOTH, expand=True, padx=5, pady=5)
        
        help_content = """
# 书签转换工具使用帮助

本工具用于将浏览器导出的书签HTML文件转换为特定格式的JSON数据，以便导入到导航站系统。

## 主要功能

1. 解析书签HTML文件，提取文件夹和链接
2. 自动将未分类的链接归入"未分类"文件夹
3. 可选合并现有JSON数据

## 使用步骤

### 1. 从浏览器导出书签

- Chrome浏览器:
  1. 打开Chrome浏览器
  2. 点击右上角的"三点"菜单
  3. 选择"书签" > "书签管理器"
  4. 点击"三点"菜单 > "导出书签"
  5. 保存HTML文件

- Firefox浏览器:
  1. 点击"书签"菜单 > "显示所有书签"
  2. 点击"导入和备份" > "导出书签到HTML"
  3. 保存HTML文件

- Edge浏览器:
  1. 点击"设置和更多"(三点菜单)
  2. 选择"收藏夹" > "管理收藏夹"
  3. 点击"..." > "导出收藏夹"
  4. 保存HTML文件

### 2. 使用本工具转换

1. 在"主操作"选项卡中，选择刚才导出的书签HTML文件
2. 如有现有JSON数据，可以选择导入(可选)
3. 设置输出JSON文件路径
4. 在"配置设置"选项卡中，设置网站标题和名称
5. 点击"开始转换"按钮
6. 等待处理完成
7. 查看日志区域的处理结果

### 3. 高级功能

- 在转换前可以点击"预览结果"查看生成的JSON结构
- 在"配置设置"选项卡中可以自定义网站标题、名称和CSS样式

## 注意事项

- 本工具会自动将未分类的链接归入"未分类"文件夹
- 如果遇到解析错误，请尝试使用不同浏览器导出书签
- 如果文件编码问题，工具会尝试多种编码方式读取
        """
        
        help_text.insert(tk.END, help_content)
        help_text.configure(state='disabled')  # 设为只读
        
        # 初始日志内容
        self.log("欢迎使用书签转换工具！请选择书签HTML文件并点击'开始转换'按钮。")
    
    def browse_bookmark_file(self):
        file_path = filedialog.askopenfilename(
            title="选择书签HTML文件",
            filetypes=[("HTML Files", "*.html *.htm"), ("Text Files", "*.txt"), ("All Files", "*.*")]
        )
        if file_path:
            self.bookmark_file_path.set(file_path)
            self.log(f"已选择书签文件: {file_path}")
    
    def browse_json_file(self):
        file_path = filedialog.askopenfilename(
            title="选择现有JSON文件(可选)",
            filetypes=[("JSON Files", "*.json"), ("Text Files", "*.txt"), ("All Files", "*.*")]
        )
        if file_path:
            self.json_file_path.set(file_path)
            self.log(f"已选择现有JSON文件: {file_path}")
            
            # 尝试加载配置
            try:
                with open(file_path, 'r', encoding='utf-8') as f:
                    data = json.load(f)
                    configs = data.get('configs', {})
                    
                    # 更新配置字段
                    if 'site.title' in configs:
                        self.site_title.set(configs['site.title'])
                    if 'site.name' in configs:
                        self.site_name.set(configs['site.name'])
                    if 'site.customCss' in configs:
                        self.custom_css_text.delete(1.0, tk.END)
                        self.custom_css_text.insert(tk.END, configs['site.customCss'])
                    
                    self.log(f"已从 {file_path} 加载配置")
            except Exception as e:
                self.log(f"加载配置失败: {str(e)}")
    
    def browse_output_file(self):
        file_path = filedialog.asksaveasfilename(
            title="选择输出文件位置",
            defaultextension=".json",
            filetypes=[("JSON Files", "*.json"), ("All Files", "*.*")]
        )
        if file_path:
            self.output_file_path.set(file_path)
            self.log(f"已设置输出文件路径: {file_path}")
    
    def log(self, message):
        """添加消息到日志区域"""
        self.log_text.insert(tk.END, message + "\n")
        self.log_text.see(tk.END)
        self.root.update_idletasks()
    
    def parse_bookmarks(self, html_content):
        """解析书签HTML内容，提取所有文件夹和链接，并处理未分类链接"""
        soup = BeautifulSoup(html_content, 'html.parser')
        
        # 所有文件夹和链接的容器
        folders = []
        all_links = set()  # 用于跟踪所有链接
        processed_links = set()  # 用于跟踪已处理的链接
        
        # 进度更新
        self.progress_var.set(20)
        self.root.update_idletasks()
        
        # 查找所有的DT元素（可能是文件夹或链接）
        all_dt = soup.find_all('dt')
        
        # 查找所有包含H3的DT元素（这些是文件夹）
        folder_count = 0
        for dt in all_dt:
            h3 = dt.find('h3')
            if not h3:
                continue  # 不是文件夹，跳过
            
            folder_name = h3.get_text().strip()
            folder = {
                "name": folder_name,
                "links": []
            }
            
            # 查找此文件夹下的DL元素（包含链接）
            dl = dt.find('dl')
            if not dl:
                continue  # 没有子元素，跳过
            
            # 查找DL下的所有A元素（链接）
            link_count = 0
            for a in dl.find_all('a'):
                link = {
                    "name": a.get_text().strip(),
                    "url": a.get('href', ''),
                    "icon": a.get('icon', '') if a.get('icon') else '',
                    "add_date": a.get('add_date', '') if a.get('add_date') else ''
                }
                folder["links"].append(link)
                processed_links.add(a.get('href', ''))  # 标记此链接已处理
                link_count += 1
            
            # 只添加有链接的文件夹
            if folder["links"]:
                folders.append(folder)
                folder_count += 1
                self.log(f"处理文件夹 '{folder_name}' 中的 {link_count} 个链接")
        
        self.progress_var.set(50)
        self.root.update_idletasks()
        
        # 收集所有链接
        for a in soup.find_all('a'):
            all_links.add(a.get('href', ''))
        
        # 找出未分类的链接
        unclassified_links = all_links - processed_links
        
        # 如果有未分类的链接，创建"未分类"文件夹
        if unclassified_links:
            unclassified_folder = {
                "name": "未分类",
                "links": []
            }
            
            # 遍历所有链接，找出未分类的
            unclassified_count = 0
            for a in soup.find_all('a'):
                if a.get('href', '') in unclassified_links:
                    link = {
                        "name": a.get_text().strip(),
                        "url": a.get('href', ''),
                        "icon": a.get('icon', '') if a.get('icon') else '',
                        "add_date": a.get('add_date', '') if a.get('add_date') else ''
                    }
                    unclassified_folder["links"].append(link)
                    unclassified_count += 1
            
            # 添加未分类文件夹
            if unclassified_folder["links"]:
                folders.append(unclassified_folder)
                self.log(f"将 {unclassified_count} 个未分类的链接归入'未分类'文件夹")
        
        self.progress_var.set(70)
        self.root.update_idletasks()
        
        return folders
    
    def convert_to_json_format(self, folders, existing_data=None):
        """将文件夹和链接转换为特定的JSON格式"""
        # 如果有现有数据，获取下一个可用的ID
        if existing_data and 'groups' in existing_data:
            try:
                next_group_id = max([g["id"] for g in existing_data['groups']]) + 1 if existing_data['groups'] else 1
                
                # 获取所有站点ID
                all_site_ids = []
                for g in existing_data['groups']:
                    if 'sites' in g:
                        for s in g['sites']:
                            if 'id' in s:
                                all_site_ids.append(s["id"])
                
                next_site_id = max(all_site_ids) + 1 if all_site_ids else 1
                next_order = max([g["order_num"] for g in existing_data['groups']]) + 1 if existing_data['groups'] else 0
                existing_groups = existing_data['groups']
                configs = existing_data.get('configs', {})
            except Exception as e:
                self.log(f"解析现有JSON数据时出错: {str(e)}")
                self.log("将创建新的JSON数据结构")
                next_group_id = 1
                next_site_id = 1
                next_order = 0
                existing_groups = []
                configs = {
                    "site.title": self.site_title.get(),
                    "site.name": self.site_name.get(),
                    "site.customCss": self.custom_css_text.get(1.0, tk.END),
                    "DB_INITIALIZED": "true"
                }
        else:
            next_group_id = 1
            next_site_id = 1
            next_order = 0
            existing_groups = []
            configs = {
                "site.title": self.site_title.get(),
                "site.name": self.site_name.get(),
                "site.customCss": self.custom_css_text.get(1.0, tk.END),
                "DB_INITIALIZED": "true"
            }
        
        # 转换文件夹为groups格式
        new_groups = []
        current_time = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        
        for folder in folders:
            group = {
                "id": next_group_id,
                "name": folder["name"],
                "order_num": next_order,
                "sites": []
            }
            
            # 添加链接作为sites
            for i, link in enumerate(folder["links"]):
                site = {
                    "id": next_site_id,
                    "group_id": next_group_id,
                    "name": link["name"],
                    "url": link["url"],
                    "icon": link["icon"],
                    "description": "",
                    "notes": "",
                    "order_num": i,
                    "created_at": current_time,
                    "updated_at": current_time
                }
                group["sites"].append(site)
                next_site_id += 1
            
            new_groups.append(group)
            next_group_id += 1
            next_order += 1
        
        # 合并现有组和新组
        final_groups = existing_groups + new_groups
        
        # 创建最终的JSON结构
        result = {
            "groups": final_groups,
            "configs": configs
        }
        
        return result

    def preview_json(self):
        """预览生成的JSON结构"""
        bookmark_path = self.bookmark_file_path.get()
        if not bookmark_path:
            messagebox.showerror("错误", "请先选择书签HTML文件！")
            return
        
        if not os.path.exists(bookmark_path):
            messagebox.showerror("错误", f"文件不存在: {bookmark_path}")
            return
        
        try:
            # 清空预览文本
            self.preview_text.delete(1.0, tk.END)
            
            # 更新状态
            self.status_var.set("正在生成预览...")
            
            # 读取HTML文件
            self.log("正在读取书签文件进行预览...")
            try:
                with open(bookmark_path, 'r', encoding='utf-8') as f:
                    html_content = f.read()
            except UnicodeDecodeError:
                # 尝试其他编码
                self.log("UTF-8编码读取失败，尝试使用其他编码...")
                with open(bookmark_path, 'r', encoding='gbk') as f:
                    html_content = f.read()
            
            # 解析书签
            self.log("正在解析书签...")
            folders = self.parse_bookmarks(html_content)
            
            if not folders:
                messagebox.showwarning("警告", "未找到有效的书签文件夹！")
                self.status_var.set("预览失败")
                return
            
            # 查看是否有现有JSON文件
            json_path = self.json_file_path.get()
            existing_data = None
            
            if json_path and os.path.exists(json_path):
                try:
                    with open(json_path, 'r', encoding='utf-8') as f:
                        existing_data = json.load(f)
                    self.log(f"已加载现有JSON文件进行预览: {json_path}")
                except Exception as e:
                    self.log(f"加载JSON文件失败: {str(e)}")
            
            # 转换为JSON格式
            self.log("正在生成JSON预览...")
            result = self.convert_to_json_format(folders, existing_data)
            
            # 显示预览
            json_str = json.dumps(result, ensure_ascii=False, indent=2)
            self.preview_text.insert(tk.END, json_str)
            
            # 更新状态
            self.status_var.set("预览生成完成")
            self.log("JSON预览生成完成")
            
            # 切换到预览选项卡
            notebook = self.root.nametowidget(self.root.children['!notebook'])
            notebook.select(2)  # 预览选项卡的索引是2
            
        except Exception as e:
            messagebox.showerror("预览错误", f"生成预览时发生错误：\n{str(e)}")
            self.log(f"预览错误: {str(e)}")
            self.status_var.set("预览失败")
    
    def start_conversion(self):
        """开始转换过程"""
        # 验证输入
        bookmark_path = self.bookmark_file_path.get()
        if not bookmark_path:
            messagebox.showerror("错误", "请选择书签HTML文件！")
            return
        
        if not os.path.exists(bookmark_path):
            messagebox.showerror("错误", f"文件不存在: {bookmark_path}")
            return
        
        output_path = self.output_file_path.get()
        if not output_path:
            messagebox.showerror("错误", "请指定输出文件路径！")
            return
        
        # 清空日志区域
        self.log_text.delete(1.0, tk.END)
        
        # 重置进度条和状态
        self.progress_var.set(0)
        self.status_var.set("处理中...")
        
        try:
            # 读取HTML文件
            self.log(f"读取书签文件: {bookmark_path}")
            try:
                with open(bookmark_path, 'r', encoding='utf-8') as f:
                    html_content = f.read()
            except UnicodeDecodeError:
                # 尝试其他编码
                self.log("UTF-8编码读取失败，尝试使用其他编码...")
                with open(bookmark_path, 'r', encoding='gbk') as f:
                    html_content = f.read()
            
            # 解析书签
            self.log("正在解析书签...")
            folders = self.parse_bookmarks(html_content)
            
            if not folders:
                self.log("警告: 没有找到有效的书签文件夹!")
                self.status_var.set("处理完成，但未找到书签")
                messagebox.showwarning("警告", "未找到有效的书签文件夹！")
                return
            
            # 查看是否有现有JSON文件
            json_path = self.json_file_path.get()
            existing_data = None
            
            if json_path and os.path.exists(json_path):
                self.log(f"读取现有JSON文件: {json_path}")
                try:
                    with open(json_path, 'r', encoding='utf-8') as f:
                        existing_data = json.load(f)
                except Exception as e:
                    self.log(f"加载JSON文件失败: {str(e)}")
                    self.log("将创建新的JSON数据")
            
            # 转换为JSON格式
            self.log("正在转换为JSON格式...")
            result = self.convert_to_json_format(folders, existing_data)
            
            self.progress_var.set(90)
            self.root.update_idletasks()
            
            # 保存结果
            self.log(f"正在保存结果到: {output_path}")
            with open(output_path, 'w', encoding='utf-8') as f:
                json.dump(result, f, ensure_ascii=False, indent=2)
            
            self.progress_var.set(100)
            self.root.update_idletasks()
            
            # 统计信息
            total_groups = len(result['groups'])
            total_sites = sum(len(g['sites']) for g in result['groups'])
            
            self.log("\n处理完成!")
            self.log(f"共处理了 {total_groups} 个分组，{total_sites} 个链接")
            self.log(f"结果已保存到: {os.path.abspath(output_path)}")
            
            self.status_var.set("处理完成")
            messagebox.showinfo("完成", f"转换完成！\n共有 {total_groups} 个分组，{total_sites} 个链接。")
            
        except Exception as e:
            self.log(f"处理过程中发生错误: {str(e)}")
            self.status_var.set("处理出错")
            messagebox.showerror("错误", f"处理过程中发生错误：\n{str(e)}")
            import traceback
            traceback.print_exc()

def main():
    root = tk.Tk()
    app = BookmarkConverterApp(root)
    root.mainloop()

if __name__ == "__main__":
    main()