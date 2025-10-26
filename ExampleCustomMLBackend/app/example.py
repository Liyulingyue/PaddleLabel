#!/usr/bin/env python3
"""
PP-YOLOE+ OpenVINO Custom Backend 使用示例
演示如何使用自定义后端进行目标检测
"""

import requests
import base64
import json
from pathlib import Path

def main():
    base_url = "http://localhost:8001"

    print("🚀 PP-YOLOE+ OpenVINO Custom Backend 使用示例")
    print("=" * 60)

    # 1. 检查服务状态
    print("1. 检查服务状态...")
    try:
        response = requests.get(f"{base_url}/")
        print(f"   ✅ 服务运行正常: {response.json()}")
    except Exception as e:
        print(f"   ❌ 服务不可用: {e}")
        return

    # 2. 加载模型 (需要准备好模型文件)
    print("\n2. 加载模型...")
    model_data = {
        "model_path": "/path/to/your/ppyoloe_model.xml",  # 请替换为实际路径
        "labels_path": "/path/to/your/labels.txt"  # 可选
    }

    try:
        response = requests.post(f"{base_url}/load", json=model_data)
        if response.status_code == 200:
            print("   ✅ 模型加载成功")
        else:
            print(f"   ❌ 模型加载失败: {response.text}")
            print("   💡 请确保模型文件路径正确")
            return
    except Exception as e:
        print(f"   ❌ 请求失败: {e}")
        return

    # 3. 获取模型状态
    print("\n3. 获取模型状态...")
    response = requests.get(f"{base_url}/status")
    status = response.json()
    print(f"   模型已加载: {status['is_loaded']}")
    if status['input_shape']:
        print(f"   输入形状: {status['input_shape']}")
    print(f"   标签数量: {status['labels_count']}")

    # 4. 获取标签列表
    print("\n4. 获取标签列表...")
    response = requests.get(f"{base_url}/labels")
    labels_data = response.json()
    print(f"   总标签数: {labels_data['count']}")
    print(f"   前10个标签: {labels_data['labels'][:10]}")

    # 5. 准备测试图像 (如果有的话)
    test_image_path = "test_image.jpg"  # 请替换为实际的测试图像路径
    if Path(test_image_path).exists():
        print(f"\n5. 执行推理测试 (图像: {test_image_path})...")

        # 读取图像并转换为base64
        with open(test_image_path, "rb") as f:
            image_data = base64.b64encode(f.read()).decode()

        infer_data = {
            "image": image_data,
            "conf_threshold": 0.5
        }

        response = requests.post(f"{base_url}/infer", json=infer_data)
        if response.status_code == 200:
            result = response.json()
            print(f"   ✅ 检测到 {result['count']} 个目标")

            for i, detection in enumerate(result['detections'][:5]):  # 显示前5个
                bbox = detection['bbox']
                print(f"   目标{i+1}: {detection['label']} "
                      ".2f"
                      f"框: [{bbox[0]:.1f}, {bbox[1]:.1f}, {bbox[2]:.1f}, {bbox[3]:.1f}]")

            if result['count'] > 5:
                print(f"   ... 还有 {result['count'] - 5} 个目标")
        else:
            print(f"   ❌ 推理失败: {response.text}")
    else:
        print(f"\n5. 跳过推理测试 (未找到测试图像: {test_image_path})")
        print("   💡 请准备一张测试图像并更新脚本中的路径")

    # 6. 卸载模型
    print("\n6. 卸载模型...")
    response = requests.post(f"{base_url}/unload")
    if response.status_code == 200:
        print("   ✅ 模型卸载成功")
    else:
        print(f"   ❌ 模型卸载失败: {response.text}")

    print("\n" + "=" * 60)
    print("🎉 示例运行完成！")
    print("\n📚 更多信息请查看 README.md")
    print("🔗 API文档: http://localhost:8001/docs")

if __name__ == "__main__":
    main()